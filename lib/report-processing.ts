import { randomUUID } from "node:crypto"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  attachReportJobErrorPayload,
  buildReferenceWeekDate,
  buildReportJobErrorPayload,
  buildStoredReportPayload,
  buildPendingReportJobPayload,
  parsePendingReportJobPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import { recordReportAlert } from "@/lib/report-monitoring"
import { getRedisConnection, isRedisConfigured } from "@/lib/redis"
import { generateLiveReportPayload } from "@/lib/report-service"
import { recordIntegrationAlertSafely } from "@/lib/integration-monitoring"
import { logError } from "@/lib/safe-logger"
import type { PendingReportJob, StoredReportPayload } from "@/types/report.types"

type QueuedReportResult =
  | { status: "processed"; reportId: string }
  | { status: "failed"; reportId: string; message: string }
  | { status: "skipped"; reportId: string; reason: string }
  | { status: "missing"; reportId: string }

type ParsedPendingReportJob = NonNullable<
  ReturnType<typeof parsePendingReportJobPayload>
>
type ReportForProcessing = NonNullable<
  Awaited<ReturnType<typeof loadReportForProcessing>>
>

const DEFAULT_PROCESS_LOCK_TTL_MS = 5 * 60 * 1000
const DEFAULT_BATCH_SIZE = 5
const DEFAULT_JOB_MAX_ATTEMPTS = 12
const DEFAULT_JOB_RETRY_DELAY_MS = 60_000
const DEFAULT_JOB_RETRY_MAX_DELAY_MS = 15 * 60_000

function getProcessLockTtlMs() {
  const value = Number.parseInt(process.env.REPORT_PROCESS_LOCK_TTL_SECONDS ?? "", 10)

  if (!Number.isFinite(value) || value < 30) {
    return DEFAULT_PROCESS_LOCK_TTL_MS
  }

  return value * 1000
}

function getDefaultBatchSize() {
  const value = Number.parseInt(process.env.REPORT_PROCESS_BATCH_SIZE ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_BATCH_SIZE
  }

  return value
}

function getDefaultJobMaxAttempts() {
  const value = Number.parseInt(process.env.REPORT_JOB_MAX_ATTEMPTS ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_JOB_MAX_ATTEMPTS
  }

  return value
}

function getJobRetryDelayMs(attemptNumber: number) {
  const baseValue = Number.parseInt(process.env.REPORT_JOB_RETRY_DELAY_SECONDS ?? "", 10)
  const maxValue = Number.parseInt(process.env.REPORT_JOB_RETRY_MAX_DELAY_SECONDS ?? "", 10)
  const baseDelayMs =
    Number.isFinite(baseValue) && baseValue >= 15
      ? baseValue * 1000
      : DEFAULT_JOB_RETRY_DELAY_MS
  const maxDelayMs =
    Number.isFinite(maxValue) && maxValue >= 60
      ? maxValue * 1000
      : DEFAULT_JOB_RETRY_MAX_DELAY_MS
  const multiplier = 2 ** Math.max(0, attemptNumber - 1)

  return Math.min(baseDelayMs * multiplier, maxDelayMs)
}

function normalizePendingJob(job: ParsedPendingReportJob): PendingReportJob {
  return {
    ...job,
    kind: job.kind ?? "GENERATION",
    storedPayload: job.storedPayload ?? null,
    attemptCount: job.attemptCount ?? 0,
    maxAttempts: job.maxAttempts ?? getDefaultJobMaxAttempts(),
    nextAttemptAt: job.nextAttemptAt ?? job.queuedAt,
    lastAttemptAt: job.lastAttemptAt ?? null,
    lastError: job.lastError ?? null,
    lease: job.lease ?? null,
  }
}

function getPendingJobNextAttemptAt(job: PendingReportJob) {
  const value = job.nextAttemptAt ?? job.queuedAt
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function isPendingJobDue(job: PendingReportJob, now = new Date()) {
  const nextAttemptAt = getPendingJobNextAttemptAt(job)

  if (!nextAttemptAt) {
    return true
  }

  return nextAttemptAt.getTime() <= now.getTime()
}

function isPendingJobLeaseActive(job: PendingReportJob, now = Date.now()) {
  if (!job.lease?.lockedAt) {
    return false
  }

  const lockedAtMs = new Date(job.lease.lockedAt).getTime()

  if (!Number.isFinite(lockedAtMs)) {
    return false
  }

  return lockedAtMs + getProcessLockTtlMs() > now
}

function buildClaimedPendingJob(job: PendingReportJob, now: Date) {
  return {
    ...job,
    lease: {
      lockedAt: now.toISOString(),
      lockToken: randomUUID(),
    },
  } satisfies PendingReportJob
}

function buildRetriedPendingJob(job: PendingReportJob, message: string, now: Date) {
  const normalizedJob = normalizePendingJob(job as ParsedPendingReportJob)
  const currentAttemptNumber = (normalizedJob.attemptCount ?? 0) + 1
  const maxAttempts = normalizedJob.maxAttempts ?? getDefaultJobMaxAttempts()

  if (currentAttemptNumber >= maxAttempts) {
    return null
  }

  const nextAttemptAt = new Date(
    now.getTime() + getJobRetryDelayMs(currentAttemptNumber)
  )

  return {
    ...normalizedJob,
    attemptCount: currentAttemptNumber,
    nextAttemptAt: nextAttemptAt.toISOString(),
    lastAttemptAt: now.toISOString(),
    lastError: message,
    lease: null,
  } satisfies PendingReportJob
}

function buildSendPendingJob(params: {
  baseJob: PendingReportJob
  storedPayload: StoredReportPayload
  now: Date
}) {
  const normalizedJob = normalizePendingJob(params.baseJob as ParsedPendingReportJob)

  return {
    ...normalizedJob,
    kind: "SEND",
    storedPayload: params.storedPayload,
    nextAttemptAt: params.now.toISOString(),
    lastAttemptAt: null,
    lastError: null,
    lease: null,
    attemptCount: 0,
  } satisfies PendingReportJob
}

async function withReportLock<T>(reportId: string, task: () => Promise<T>) {
  if (!isRedisConfigured()) {
    return task()
  }

  const redis = getRedisConnection("client")
  const token = `${Date.now()}:${Math.random().toString(36).slice(2)}`
  const key = `greatgo:report:lock:${reportId}`
  const lockAcquired = await redis.set(
    key,
    token,
    "PX",
    getProcessLockTtlMs(),
    "NX"
  )

  if (lockAcquired !== "OK") {
    return null
  }

  try {
    return await task()
  } finally {
    await redis
      .eval(
        `
          if redis.call("get", KEYS[1]) == ARGV[1] then
            return redis.call("del", KEYS[1])
          end
          return 0
        `,
        1,
        key,
        token
      )
      .catch(() => undefined)
  }
}

async function loadReportForProcessing(reportId: string) {
  return prisma.report.findUnique({
    where: { id: reportId },
    include: {
      client: {
        include: {
          manager: {
            select: {
              id: true,
              metaAccessToken: true,
              metaTokenExpiresAt: true,
            },
          },
        },
      },
    },
  })
}

async function loadRequestedByUser(requestedByUserId: string) {
  return prisma.user.findUnique({
    where: { id: requestedByUserId },
    select: {
      id: true,
      metaAccessToken: true,
      metaTokenExpiresAt: true,
    },
  })
}

async function recordGenerationFailureAlert(params: {
  reportId: string
  message: string
  pendingJob: PendingReportJob
}) {
  await recordReportAlert({
    severity: "error",
    source: "report-generation",
    queueName: "report-generation",
    message: "Falha ao processar um relatorio pendente.",
    jobId: params.reportId,
    jobName: params.pendingJob.source,
    details: {
      requestedByUserId: params.pendingJob.requestedByUserId,
      filters: params.pendingJob.filters,
      errorMessage: params.message,
      attemptCount: params.pendingJob.attemptCount,
      nextAttemptAt: params.pendingJob.nextAttemptAt,
    },
  }).catch((error) => {
    logError("report-processing.alert.generation", error, {
      reportId: params.reportId,
    })
  })
}

async function recordSendFailureAlert(params: {
  reportId: string
  message: string
  pendingJob: PendingReportJob
}) {
  await recordReportAlert({
    severity: "warning",
    source: "report-send",
    queueName: "report-send",
    message: "Falha ao enviar automaticamente um relatorio ja gerado.",
    jobId: params.reportId,
    jobName: params.pendingJob.source,
    details: {
      sendOptions: params.pendingJob.sendOptions,
      errorMessage: params.message,
      attemptCount: params.pendingJob.attemptCount,
      nextAttemptAt: params.pendingJob.nextAttemptAt,
    },
  }).catch((error) => {
    logError("report-processing.alert.send", error, {
      reportId: params.reportId,
    })
  })

  await recordIntegrationAlertSafely({
    severity: "error",
    integration: "whatsapp",
    source: "queued-send",
    message: "Falha ao enviar relatorio a partir da fila persistida.",
    dedupeKey: `${params.reportId}:queued-send`,
    details: {
      reportId: params.reportId,
      errorMessage: params.message,
      sendOptions: params.pendingJob.sendOptions,
      attemptCount: params.pendingJob.attemptCount,
      nextAttemptAt: params.pendingJob.nextAttemptAt,
    },
  })
}

async function claimPendingJob(params: {
  reportId: string
  currentPayloadJson: Prisma.JsonValue | null
  pendingJob: PendingReportJob
}) {
  const now = new Date()
  const normalizedJob = normalizePendingJob(params.pendingJob as ParsedPendingReportJob)

  if (!isPendingJobDue(normalizedJob, now)) {
    return null
  }

  if (isPendingJobLeaseActive(normalizedJob, now.getTime())) {
    return null
  }

  const claimedJob = buildClaimedPendingJob(normalizedJob, now)
  const updateResult = await prisma.report.updateMany({
    where: {
      id: params.reportId,
      status: "PENDING",
      payloadJson: {
        equals: params.currentPayloadJson as Prisma.InputJsonValue,
      },
    },
    data: {
      payloadJson: buildPendingReportJobPayload(claimedJob),
    },
  })

  return updateResult.count > 0 ? claimedJob : null
}

async function persistRetriedJob(params: {
  reportId: string
  pendingJob: PendingReportJob
}) {
  await prisma.report.update({
    where: { id: params.reportId },
    data: {
      status: "PENDING",
      payloadJson: buildPendingReportJobPayload(params.pendingJob),
    },
  })
}

async function persistFinalGenerationFailure(params: {
  reportId: string
  message: string
}) {
  await prisma.report.update({
    where: { id: params.reportId },
    data: {
      status: "FAILED",
      payloadJson: buildReportJobErrorPayload(params.message, "GENERATION"),
    },
  })
}

async function persistFinalSendFailure(params: {
  reportId: string
  message: string
  storedPayload: StoredReportPayload | null
}) {
  await prisma.report.update({
    where: { id: params.reportId },
    data: {
      status: "FAILED",
      payloadJson: params.storedPayload
        ? attachReportJobErrorPayload(params.storedPayload, params.message, "SEND")
        : buildReportJobErrorPayload(params.message, "SEND"),
    },
  })
}

async function handleGenerationFailure(params: {
  reportId: string
  pendingJob: PendingReportJob
  message: string
}) {
  const now = new Date()
  const retriedJob = buildRetriedPendingJob(params.pendingJob, params.message, now)

  await recordGenerationFailureAlert(params)

  if (retriedJob) {
    await persistRetriedJob({
      reportId: params.reportId,
      pendingJob: retriedJob,
    })
  } else {
    await persistFinalGenerationFailure({
      reportId: params.reportId,
      message: params.message,
    })
  }
}

async function handleSendFailure(params: {
  reportId: string
  pendingJob: PendingReportJob
  storedPayload: StoredReportPayload | null
  message: string
}) {
  const now = new Date()
  const retriedJob = buildRetriedPendingJob(params.pendingJob, params.message, now)

  await recordSendFailureAlert(params)

  if (retriedJob) {
    await persistRetriedJob({
      reportId: params.reportId,
      pendingJob: {
        ...retriedJob,
        kind: "SEND",
        storedPayload: params.storedPayload,
      },
    })
  } else {
    await persistFinalSendFailure({
      reportId: params.reportId,
      message: params.message,
      storedPayload: params.storedPayload,
    })
  }
}

async function processSendJob(params: {
  reportId: string
  pendingJob: PendingReportJob
}) {
  const storedPayload = params.pendingJob.storedPayload ?? null

  if (!storedPayload) {
    const message = "Relatorio gerado nao encontrado para envio automatico"
    await handleSendFailure({
      reportId: params.reportId,
      pendingJob: params.pendingJob,
      storedPayload: null,
      message,
    })

    return {
      status: "failed" as const,
      reportId: params.reportId,
      message,
    }
  }

  try {
    await sendPersistedReportNow(params.reportId, {
      mode: params.pendingJob.sendOptions?.mode,
      message: params.pendingJob.sendOptions?.message,
      groupId: params.pendingJob.sendOptions?.groupId,
      pdfStrategy: "standard",
    })

    await prisma.report.update({
      where: { id: params.reportId },
      data: {
        status: "SENT",
        payloadJson: serializeStoredReportPayload(storedPayload),
      },
    })

    return {
      status: "processed" as const,
      reportId: params.reportId,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar relatorio"

    logError("report-processing.send", error, {
      reportId: params.reportId,
      source: params.pendingJob.source,
    })

    await handleSendFailure({
      reportId: params.reportId,
      pendingJob: params.pendingJob,
      storedPayload,
      message,
    })

    return {
      status: "failed" as const,
      reportId: params.reportId,
      message,
    }
  }
}

async function processGenerationJob(params: {
  reportId: string
  pendingJob: PendingReportJob
  client: ReportForProcessing["client"]
}) {
  const user = await loadRequestedByUser(params.pendingJob.requestedByUserId)

  if (!user) {
    const message = "Usuario responsavel pelo relatorio nao foi encontrado"
    await handleGenerationFailure({
      reportId: params.reportId,
      pendingJob: params.pendingJob,
      message,
    })

    return {
      status: "failed" as const,
      reportId: params.reportId,
      message,
    }
  }

  try {
    const payload = await generateLiveReportPayload({
      user,
      client: params.client,
      filters: params.pendingJob.filters,
    })
    const generatedAt = new Date()
    const storedPayload = buildStoredReportPayload(
      payload,
      params.pendingJob.filters,
      generatedAt
    )

    if (!params.pendingJob.enqueueSendOnComplete) {
      await prisma.report.update({
        where: { id: params.reportId },
        data: {
          generatedAt,
          referenceWeek: buildReferenceWeekDate(params.pendingJob.filters.since),
          status: "PENDING",
          payloadJson: serializeStoredReportPayload(storedPayload),
        },
      })

      return {
        status: "processed" as const,
        reportId: params.reportId,
      }
    }

    const sendPendingJob = buildSendPendingJob({
      baseJob: params.pendingJob,
      storedPayload,
      now: generatedAt,
    })

    await prisma.report.update({
      where: { id: params.reportId },
      data: {
        generatedAt,
        referenceWeek: buildReferenceWeekDate(params.pendingJob.filters.since),
        status: "PENDING",
        payloadJson: buildPendingReportJobPayload(sendPendingJob),
      },
    })

    return processSendJob({
      reportId: params.reportId,
      pendingJob: sendPendingJob,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar relatorio"

    logError("report-processing.generate", error, {
      reportId: params.reportId,
      source: params.pendingJob.source,
    })

    await handleGenerationFailure({
      reportId: params.reportId,
      pendingJob: params.pendingJob,
      message,
    })

    return {
      status: "failed" as const,
      reportId: params.reportId,
      message,
    }
  }
}

export async function processQueuedReport(reportId: string): Promise<QueuedReportResult> {
  const result = await withReportLock(reportId, async () => {
    const report = await loadReportForProcessing(reportId)

    if (!report) {
      return { status: "missing" as const, reportId }
    }

    if (report.status !== "PENDING") {
      return {
        status: "skipped" as const,
        reportId,
        reason: `status:${report.status}`,
      }
    }

    const pendingJob = parsePendingReportJobPayload(report.payloadJson)

    if (!pendingJob) {
      return {
        status: "skipped" as const,
        reportId,
        reason: "already-generated",
      }
    }

    const claimedJob = await claimPendingJob({
      reportId,
      currentPayloadJson: report.payloadJson,
      pendingJob,
    })

    if (!claimedJob) {
      return {
        status: "skipped" as const,
        reportId,
        reason: isPendingJobLeaseActive(pendingJob) ? "leased" : "not-due",
      }
    }

    if (claimedJob.kind === "SEND") {
      return processSendJob({
        reportId,
        pendingJob: claimedJob,
      })
    }

    return processGenerationJob({
      reportId,
      pendingJob: claimedJob,
      client: report.client,
    })
  })

  if (result) {
    return result
  }

  return {
    status: "skipped",
    reportId,
    reason: "locked",
  }
}

export async function processQueuedReportSafely(reportId: string) {
  try {
    return await processQueuedReport(reportId)
  } catch (error) {
    logError("report-processing.process", error, {
      reportId,
    })

    return {
      status: "failed" as const,
      reportId,
      message:
        error instanceof Error ? error.message : "Falha inesperada ao processar relatorio",
    }
  }
}

export async function listPendingQueuedReportIds(limit = getDefaultBatchSize()) {
  const queuedIds: string[] = []
  const pageSize = Math.max(limit * 5, 25)
  let skip = 0
  const now = new Date()

  while (queuedIds.length < limit) {
    const candidates = await prisma.report.findMany({
      where: {
        status: "PENDING",
        payloadJson: {
          not: Prisma.JsonNull,
        },
      },
      orderBy: {
        generatedAt: "asc",
      },
      select: {
        id: true,
        payloadJson: true,
      },
      take: pageSize,
      skip,
    })

    if (candidates.length === 0) {
      break
    }

    for (const candidate of candidates) {
      const pendingJob = parsePendingReportJobPayload(candidate.payloadJson)

      if (!pendingJob) {
        continue
      }

      if (!isPendingJobDue(pendingJob, now) || isPendingJobLeaseActive(pendingJob, now.getTime())) {
        continue
      }

      queuedIds.push(candidate.id)

      if (queuedIds.length >= limit) {
        break
      }
    }

    if (candidates.length < pageSize) {
      break
    }

    skip += pageSize
  }

  return queuedIds
}

export async function processPendingReportBatch(limit = getDefaultBatchSize()) {
  const reportIds = await listPendingQueuedReportIds(limit)
  const results: QueuedReportResult[] = []

  for (const reportId of reportIds) {
    results.push(await processQueuedReportSafely(reportId))
  }

  return {
    attempted: reportIds.length,
    processed: results.filter((result) => result.status === "processed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  }
}
