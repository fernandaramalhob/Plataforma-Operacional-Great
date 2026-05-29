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
  parseStoredReportPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import { resolveUserEvolutionInstance } from "@/lib/evolution-preference"
import { recordReportAlert } from "@/lib/report-monitoring"
import { getRedisConnection, isRedisConfigured } from "@/lib/redis"
import { buildWeeklyReportWeekKey } from "@/lib/reporting/weekly-report-time"
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
const DEFAULT_BATCH_SIZE = 10
const DEFAULT_JOB_MAX_ATTEMPTS = 12
const DEFAULT_JOB_RETRY_DELAY_MS = 60_000
const DEFAULT_JOB_RETRY_MAX_DELAY_MS = 15 * 60_000
// No Vercel Pro com cron por minuto, usamos os mesmos defaults do modo local.
// O cron frequente já faz o papel de reprocessador — não precisamos de delays curtos.
const DEFAULT_VERCEL_JOB_MAX_ATTEMPTS = DEFAULT_JOB_MAX_ATTEMPTS
const DEFAULT_VERCEL_JOB_RETRY_DELAY_MS = DEFAULT_JOB_RETRY_DELAY_MS
const DEFAULT_VERCEL_JOB_RETRY_MAX_DELAY_MS = DEFAULT_JOB_RETRY_MAX_DELAY_MS
const DEFAULT_STALE_PENDING_SEND_GRACE_MS = 6 * 60 * 60 * 1000

function logReportWorkerEvent(params: {
  event: string
  reportId: string
  clientId: string
  clientName?: string | null
  pendingJob: PendingReportJob
  message?: string | null
}) {
  const payload = {
    event: params.event,
    reportId: params.reportId,
    clientId: params.clientId,
    clientName: params.clientName?.trim() || null,
    source: params.pendingJob.source,
    kind: params.pendingJob.kind ?? "GENERATION",
    scheduledSendAt: params.pendingJob.scheduledSendAt ?? null,
    nextAttemptAt: params.pendingJob.nextAttemptAt ?? null,
    attemptCount: params.pendingJob.attemptCount ?? 0,
    maxAttempts: params.pendingJob.maxAttempts ?? null,
    groupId: params.pendingJob.sendOptions?.groupId ?? null,
    message: params.message?.trim() || null,
  }

  console.log(`[report-worker] ${JSON.stringify(payload)}`)
}

function isVercelCronFriendlyRetryMode() {
  return Boolean(process.env.VERCEL?.trim())
}

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

  return Math.max(value, DEFAULT_BATCH_SIZE)
}

function getDefaultJobMaxAttempts() {
  const value = Number.parseInt(process.env.REPORT_JOB_MAX_ATTEMPTS ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return isVercelCronFriendlyRetryMode()
      ? DEFAULT_VERCEL_JOB_MAX_ATTEMPTS
      : DEFAULT_JOB_MAX_ATTEMPTS
  }

  return value
}

function getJobRetryDelayMs(attemptNumber: number) {
  const baseValue = Number.parseInt(process.env.REPORT_JOB_RETRY_DELAY_SECONDS ?? "", 10)
  const maxValue = Number.parseInt(process.env.REPORT_JOB_RETRY_MAX_DELAY_SECONDS ?? "", 10)
  const baseDelayMs =
    Number.isFinite(baseValue) && baseValue >= 1
      ? baseValue * 1000
      : isVercelCronFriendlyRetryMode()
        ? DEFAULT_VERCEL_JOB_RETRY_DELAY_MS
        : DEFAULT_JOB_RETRY_DELAY_MS
  const maxDelayMs =
    Number.isFinite(maxValue) && maxValue >= 1
      ? maxValue * 1000
      : isVercelCronFriendlyRetryMode()
        ? DEFAULT_VERCEL_JOB_RETRY_MAX_DELAY_MS
        : DEFAULT_JOB_RETRY_MAX_DELAY_MS
  const multiplier = 2 ** Math.max(0, attemptNumber - 1)

  return Math.min(baseDelayMs * multiplier, maxDelayMs)
}

function normalizePendingJob(job: ParsedPendingReportJob): PendingReportJob {
  const defaultMaxAttempts = getDefaultJobMaxAttempts()
  const resolvedMaxAttempts =
    typeof job.maxAttempts === "number" && Number.isFinite(job.maxAttempts) && job.maxAttempts > 0
      ? isVercelCronFriendlyRetryMode()
        ? Math.min(job.maxAttempts, defaultMaxAttempts)
        : job.maxAttempts
      : defaultMaxAttempts

  return {
    ...job,
    kind: job.kind ?? "GENERATION",
    scheduledSendAt: job.scheduledSendAt ?? null,
    storedPayload: job.storedPayload ?? null,
    attemptCount: job.attemptCount ?? 0,
    maxAttempts: resolvedMaxAttempts,
    nextAttemptAt: job.nextAttemptAt ?? job.queuedAt,
    lastAttemptAt: job.lastAttemptAt ?? null,
    lastError: job.lastError ?? null,
    lease: job.lease ?? null,
  }
}

function getPendingJobScheduledSendAt(job: PendingReportJob) {
  if (!job.scheduledSendAt) {
    return null
  }

  const date = new Date(job.scheduledSendAt)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
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
  keepLease?: boolean
}) {
  const normalizedJob = normalizePendingJob(params.baseJob as ParsedPendingReportJob)
  const scheduledSendAt =
    getPendingJobScheduledSendAt(normalizedJob)?.toISOString()
    ?? params.now.toISOString()

  return {
    ...normalizedJob,
    kind: "SEND",
    storedPayload: params.storedPayload,
    nextAttemptAt: scheduledSendAt,
    lastAttemptAt: null,
    lastError: null,
    lease: params.keepLease ? normalizedJob.lease ?? null : null,
    attemptCount: 0,
  } satisfies PendingReportJob
}

function getStalePendingSendGraceMs() {
  const value = Number.parseInt(process.env.REPORT_STALE_PENDING_SEND_GRACE_SECONDS ?? "", 10)

  if (!Number.isFinite(value) || value < 300) {
    return DEFAULT_STALE_PENDING_SEND_GRACE_MS
  }

  return value * 1000
}

function isPermanentMetaPermissionError(message: string) {
  const normalized = message.toLowerCase()

  return (
    normalized.includes("ads_management")
    || normalized.includes("ads_read permission")
    || normalized.includes("ad account owner has not grant")
    || normalized.includes("permissions-and-features")
  )
}

function shouldRetryGenerationFailure(message: string) {
  return !isPermanentMetaPermissionError(message)
}

function buildPendingJobErrorDetails(pendingJob: PendingReportJob) {
  return {
    scheduledAt: pendingJob.scheduledSendAt ?? pendingJob.queuedAt ?? null,
    nextAttemptAt: pendingJob.nextAttemptAt ?? null,
    groupId: pendingJob.sendOptions?.groupId ?? null,
    groupName: null,
  }
}

async function isReportCancelled(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    select: { status: true },
  })

  return report?.status === "CANCELLED"
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
    message: "Falha ao processar um relatório pendente.",
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
    message: "Falha ao enviar automaticamente um relatório ja gerado.",
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
    message: "Falha ao enviar relatório a partir da fila persistida.",
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
  await prisma.report.updateMany({
    where: {
      id: params.reportId,
      status: {
        not: "CANCELLED",
      },
    },
    data: {
      status: "PENDING",
      payloadJson: buildPendingReportJobPayload(params.pendingJob),
    },
  })
}

function getWeeklyDispatchKey(pendingJob: PendingReportJob) {
  if (pendingJob.source !== "weekly") {
    return null
  }

  return buildWeeklyReportWeekKey({
    since: pendingJob.filters.since,
    until: pendingJob.filters.until,
  })
}

async function markWeeklyDispatchAsSent(params: {
  clientId: string
  pendingJob: PendingReportJob
  reportId: string
  sentAt: Date
}) {
  const reportWeekKey = getWeeklyDispatchKey(params.pendingJob)

  if (!reportWeekKey) {
    return
  }

  await prisma.weeklyReportDispatch.updateMany({
    where: {
      clientId: params.clientId,
      reportWeekKey,
    },
    data: {
      reportId: params.reportId,
      status: "SENT",
      sentAt: params.sentAt,
      errorMessage: null,
      processingToken: null,
      processingStartedAt: null,
    },
  })
}

async function markWeeklyDispatchAsFailed(params: {
  clientId: string
  pendingJob: PendingReportJob
  reportId: string
  errorMessage: string
}) {
  const reportWeekKey = getWeeklyDispatchKey(params.pendingJob)

  if (!reportWeekKey) {
    return
  }

  await prisma.weeklyReportDispatch.updateMany({
    where: {
      clientId: params.clientId,
      reportWeekKey,
    },
    data: {
      reportId: params.reportId,
      status: "FAILED",
      errorMessage: params.errorMessage,
      processingToken: null,
      processingStartedAt: null,
    },
  })
}

async function persistFinalGenerationFailure(params: {
  reportId: string
  message: string
  pendingJob: PendingReportJob
}) {
  await prisma.report.updateMany({
    where: {
      id: params.reportId,
      status: {
        not: "CANCELLED",
      },
    },
    data: {
      status: "FAILED",
      payloadJson: buildReportJobErrorPayload(
        params.message,
        "GENERATION",
        buildPendingJobErrorDetails(params.pendingJob)
      ),
    },
  })
}

async function persistFinalSendFailure(params: {
  reportId: string
  message: string
  storedPayload: StoredReportPayload | null
  pendingJob: PendingReportJob
}) {
  await prisma.report.updateMany({
    where: {
      id: params.reportId,
      status: {
        not: "CANCELLED",
      },
    },
    data: {
      status: "FAILED",
      payloadJson: params.storedPayload
        ? attachReportJobErrorPayload(
            params.storedPayload,
            params.message,
            "SEND",
            buildPendingJobErrorDetails(params.pendingJob)
          )
        : buildReportJobErrorPayload(
            params.message,
            "SEND",
            buildPendingJobErrorDetails(params.pendingJob)
          ),
    },
  })
}

async function persistLegacyPendingSendFailure(params: {
  reportId: string
  message: string
  storedPayload: StoredReportPayload
}) {
  await prisma.$transaction([
    prisma.sendLog.updateMany({
      where: {
        reportId: params.reportId,
        status: "PENDING",
        sentAt: null,
      },
      data: {
        status: "FAILED",
        errorMessage: params.message,
      },
    }),
    prisma.report.updateMany({
      where: {
        id: params.reportId,
        status: "PENDING",
      },
      data: {
        status: "FAILED",
        payloadJson: attachReportJobErrorPayload(
          params.storedPayload,
          params.message,
          "SEND"
        ),
      },
    }),
  ])
}

async function persistLegacyCompletedSend(params: {
  reportId: string
  storedPayload: StoredReportPayload
}) {
  await prisma.report.updateMany({
    where: {
      id: params.reportId,
      status: "PENDING",
    },
    data: {
      status: "SENT",
      payloadJson: serializeStoredReportPayload(params.storedPayload),
    },
  })
}

async function handleGenerationFailure(params: {
  clientId: string
  clientName?: string | null
  reportId: string
  pendingJob: PendingReportJob
  message: string
}) {
  const now = new Date()
  const retriedJob = shouldRetryGenerationFailure(params.message)
    ? buildRetriedPendingJob(params.pendingJob, params.message, now)
    : null

  await recordGenerationFailureAlert(params)

  if (retriedJob) {
    logReportWorkerEvent({
      event: "generation.retry-scheduled",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: retriedJob,
      message: params.message,
    })

    await persistRetriedJob({
      reportId: params.reportId,
      pendingJob: retriedJob,
    })
  } else {
    logReportWorkerEvent({
      event: "generation.failed",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: params.pendingJob,
      message: params.message,
    })

    await persistFinalGenerationFailure({
      reportId: params.reportId,
      message: params.message,
      pendingJob: params.pendingJob,
    })
    await markWeeklyDispatchAsFailed({
      clientId: params.clientId,
      pendingJob: params.pendingJob,
      reportId: params.reportId,
      errorMessage: params.message,
    }).catch((error) => {
      logError("report-processing.weekly.generation-failed", error, {
        clientId: params.clientId,
        reportId: params.reportId,
      })
    })
  }
}

export async function reconcileStalePendingReports(limit = getDefaultBatchSize()) {
  const staleBefore = new Date(Date.now() - getStalePendingSendGraceMs())
  const candidates = await prisma.report.findMany({
    where: {
      status: "PENDING",
      generatedAt: {
        lte: staleBefore,
      },
    },
    orderBy: {
      generatedAt: "asc",
    },
    take: Math.max(limit * 5, 25),
    select: {
      id: true,
      payloadJson: true,
      sendLogs: {
        select: {
          status: true,
          sentAt: true,
          errorMessage: true,
        },
      },
    },
  })

  let reconciled = 0

  for (const candidate of candidates) {
    if (reconciled >= limit) {
      break
    }

    if (parsePendingReportJobPayload(candidate.payloadJson)) {
      continue
    }

    const storedPayload = parseStoredReportPayload(candidate.payloadJson)

    if (!storedPayload) {
      continue
    }

    const hasOpenPendingSend = candidate.sendLogs.some(
      (sendLog) => sendLog.status === "PENDING" && !sendLog.sentAt
    )
    const hasSuccessfulSend = candidate.sendLogs.some(
      (sendLog) => sendLog.status === "OK" && Boolean(sendLog.sentAt)
    )

    if (hasSuccessfulSend) {
      await persistLegacyCompletedSend({
        reportId: candidate.id,
        storedPayload,
      })

      reconciled += 1
      continue
    }

    if (!hasOpenPendingSend) {
      continue
    }

    await persistLegacyPendingSendFailure({
      reportId: candidate.id,
      message:
        "Envio antigo interrompido antes da fila persistida; marcado como falha para evitar pendencia eterna.",
      storedPayload,
    })

    reconciled += 1
  }

  return reconciled
}

async function handleSendFailure(params: {
  clientId: string
  clientName?: string | null
  reportId: string
  pendingJob: PendingReportJob
  storedPayload: StoredReportPayload | null
  message: string
}) {
  const now = new Date()
  const retriedJob = buildRetriedPendingJob(params.pendingJob, params.message, now)

  await recordSendFailureAlert(params)

  if (retriedJob) {
    logReportWorkerEvent({
      event: "send.retry-scheduled",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: {
        ...retriedJob,
        kind: "SEND",
        storedPayload: params.storedPayload,
      },
      message: params.message,
    })

    await persistRetriedJob({
      reportId: params.reportId,
      pendingJob: {
        ...retriedJob,
        kind: "SEND",
        storedPayload: params.storedPayload,
      },
    })
  } else {
    logReportWorkerEvent({
      event: "send.failed",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: params.pendingJob,
      message: params.message,
    })

    await persistFinalSendFailure({
      reportId: params.reportId,
      message: params.message,
      storedPayload: params.storedPayload,
      pendingJob: params.pendingJob,
    })
    await markWeeklyDispatchAsFailed({
      clientId: params.clientId,
      pendingJob: params.pendingJob,
      reportId: params.reportId,
      errorMessage: params.message,
    }).catch((error) => {
      logError("report-processing.weekly.send-failed", error, {
        clientId: params.clientId,
        reportId: params.reportId,
      })
    })
  }
}

async function processSendJob(params: {
  clientId: string
  clientName?: string | null
  reportId: string
  pendingJob: PendingReportJob
}) {
  const storedPayload = params.pendingJob.storedPayload ?? null

  if (await isReportCancelled(params.reportId)) {
    return {
      status: "skipped" as const,
      reportId: params.reportId,
      reason: "cancelled",
    }
  }

  if (!storedPayload) {
    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const message = "Relatório gerado não encontrado para envio automático"
    await handleSendFailure({
      clientId: params.clientId,
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
    logReportWorkerEvent({
      event: "send.started",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: params.pendingJob,
    })

    const preferredInstance = await resolveUserEvolutionInstance(
      params.pendingJob.requestedByUserId
    )

    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const delivery = await sendPersistedReportNow(params.reportId, {
      mode: params.pendingJob.sendOptions?.mode,
      message: params.pendingJob.sendOptions?.message,
      groupId: params.pendingJob.sendOptions?.groupId,
      instance: preferredInstance,
      pdfStrategy: "auto",
      deferReportStatusUpdate: true,
      preventDuplicateSends: true,
      authorization: {
        type: "scheduled-automation",
        source: params.pendingJob.source,
      },
    })

    if (delivery.duplicatePrevented && delivery.duplicateReason === "in-flight") {
      logReportWorkerEvent({
        event: "send.skipped-duplicate",
        reportId: params.reportId,
        clientId: params.clientId,
        clientName: params.clientName,
        pendingJob: params.pendingJob,
        message: "Outro envio automatico deste agendamento ja esta em andamento.",
      })

      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "duplicate-in-flight",
      }
    }

    if (delivery.duplicatePrevented && delivery.duplicateReason === "already-sent") {
      await prisma.report.updateMany({
        where: {
          id: params.reportId,
          status: "PENDING",
        },
        data: {
          status: "SENT",
          payloadJson: serializeStoredReportPayload(storedPayload),
        },
      })

      await markWeeklyDispatchAsSent({
        clientId: params.clientId,
        pendingJob: params.pendingJob,
        reportId: params.reportId,
        sentAt: new Date(),
      }).catch((error) => {
        logError("report-processing.weekly.sent-duplicate", error, {
          clientId: params.clientId,
          reportId: params.reportId,
        })
      })

      logReportWorkerEvent({
        event: "send.already-sent",
        reportId: params.reportId,
        clientId: params.clientId,
        clientName: params.clientName,
        pendingJob: params.pendingJob,
        message: "Envio automatico ja concluido anteriormente para este agendamento.",
      })

      return {
        status: "processed" as const,
        reportId: params.reportId,
      }
    }

    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const updated = await prisma.report.updateMany({
      where: {
        id: params.reportId,
        status: "PENDING",
      },
      data: {
        status: "SENT",
        payloadJson: serializeStoredReportPayload(storedPayload),
      },
    })

    if (updated.count === 0) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    await markWeeklyDispatchAsSent({
      clientId: params.clientId,
      pendingJob: params.pendingJob,
      reportId: params.reportId,
      sentAt: new Date(),
    }).catch((error) => {
      logError("report-processing.weekly.sent", error, {
        clientId: params.clientId,
        reportId: params.reportId,
      })
    })

    logReportWorkerEvent({
      event: "send.completed",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: params.pendingJob,
    })

    return {
      status: "processed" as const,
      reportId: params.reportId,
    }
  } catch (error) {
    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const message =
      error instanceof Error ? error.message : "Erro ao enviar relatório"

    logError("report-processing.send", error, {
      reportId: params.reportId,
      source: params.pendingJob.source,
    })

    await handleSendFailure({
      clientId: params.clientId,
      clientName: params.clientName,
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
  clientId: string
  clientName?: string | null
  reportId: string
  pendingJob: PendingReportJob
  client: ReportForProcessing["client"]
}) {
  if (await isReportCancelled(params.reportId)) {
    return {
      status: "skipped" as const,
      reportId: params.reportId,
      reason: "cancelled",
    }
  }

  const user = await loadRequestedByUser(params.pendingJob.requestedByUserId)

  if (!user) {
    const message = "Usuário responsável pelo relatório não foi encontrado"
    await handleGenerationFailure({
      clientId: params.clientId,
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
    logReportWorkerEvent({
      event: "generation.started",
      reportId: params.reportId,
      clientId: params.clientId,
      clientName: params.clientName,
      pendingJob: params.pendingJob,
    })

    const payload = await generateLiveReportPayload({
      user,
      client: params.client,
      filters: params.pendingJob.filters,
    })

    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const generatedAt = new Date()
    const storedPayload = buildStoredReportPayload(
      payload,
      params.pendingJob.filters,
      generatedAt,
      params.pendingJob.presentation
    )

    if (!params.pendingJob.enqueueSendOnComplete) {
      const updated = await prisma.report.updateMany({
        where: {
          id: params.reportId,
          status: "PENDING",
        },
        data: {
          generatedAt,
          referenceWeek: buildReferenceWeekDate(params.pendingJob.filters.since),
          status: "PENDING",
          payloadJson: serializeStoredReportPayload(storedPayload),
        },
      })

      if (updated.count === 0) {
        return {
          status: "skipped" as const,
          reportId: params.reportId,
          reason: "cancelled",
        }
      }

      logReportWorkerEvent({
        event: "generation.completed",
        reportId: params.reportId,
        clientId: params.clientId,
        clientName: params.clientName,
        pendingJob: params.pendingJob,
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
      keepLease: true,
    })

    const updated = await prisma.report.updateMany({
      where: {
        id: params.reportId,
        status: "PENDING",
      },
      data: {
        generatedAt,
        referenceWeek: buildReferenceWeekDate(params.pendingJob.filters.since),
        status: "PENDING",
        payloadJson: buildPendingReportJobPayload(sendPendingJob),
      },
    })

    if (updated.count === 0) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    if (!isPendingJobDue(sendPendingJob, generatedAt)) {
      await prisma.report.updateMany({
        where: {
          id: params.reportId,
          status: "PENDING",
        },
        data: {
          payloadJson: buildPendingReportJobPayload({
            ...sendPendingJob,
            lease: null,
          }),
        },
      })

      logReportWorkerEvent({
        event: "generation.completed-awaiting-send",
        reportId: params.reportId,
        clientId: params.clientId,
        clientName: params.clientName,
        pendingJob: {
          ...sendPendingJob,
          lease: null,
        },
      })

      return {
        status: "processed" as const,
        reportId: params.reportId,
      }
    }

    return processSendJob({
      clientId: params.clientId,
      clientName: params.clientName,
      reportId: params.reportId,
      pendingJob: sendPendingJob,
    })
  } catch (error) {
    if (await isReportCancelled(params.reportId)) {
      return {
        status: "skipped" as const,
        reportId: params.reportId,
        reason: "cancelled",
      }
    }

    const message =
      error instanceof Error ? error.message : "Erro ao gerar relatório"

    logError("report-processing.generate", error, {
      reportId: params.reportId,
      source: params.pendingJob.source,
    })

    await handleGenerationFailure({
      clientId: params.clientId,
      clientName: params.clientName,
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
      const storedPayload = parseStoredReportPayload(report.payloadJson)

      if (!storedPayload) {
        await prisma.report.updateMany({
          where: {
            id: reportId,
            status: "PENDING",
          },
          data: {
            status: "FAILED",
            payloadJson: buildReportJobErrorPayload(
              "Relatório pendente sem dados de processamento. Gere o relatório novamente.",
              "GENERATION"
            ),
          },
        })

        return {
          status: "failed" as const,
          reportId,
          message:
            "Relatório pendente sem dados de processamento. Gere o relatório novamente.",
        }
      }

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
        clientId: report.clientId,
        clientName: report.client.name,
        reportId,
        pendingJob: claimedJob,
      })
    }

    return processGenerationJob({
      clientId: report.clientId,
      clientName: report.client.name,
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
        error instanceof Error ? error.message : "Falha inesperada ao processar relatório",
    }
  }
}

export async function listPendingQueuedReportIds(
  limit = getDefaultBatchSize(),
  options?: {
    kind?: "GENERATION" | "SEND"
    excludeIds?: string[]
  }
) {
  const queuedIds: string[] = []
  const pageSize = Math.max(limit * 5, 25)
  let skip = 0
  const now = new Date()
  const excludedIds = new Set(options?.excludeIds ?? [])

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
      if (excludedIds.has(candidate.id)) {
        continue
      }

      const pendingJob = parsePendingReportJobPayload(candidate.payloadJson)

      if (!pendingJob) {
        continue
      }

      if (options?.kind && pendingJob.kind !== options.kind) {
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
  const sendIds = await listPendingQueuedReportIds(limit, {
    kind: "SEND",
  })
  const remainingSlots = Math.max(0, limit - sendIds.length)
  const generationIds =
    remainingSlots > 0
      ? await listPendingQueuedReportIds(remainingSlots, {
          kind: "GENERATION",
          excludeIds: sendIds,
        })
      : []
  const reportIds = [...sendIds, ...generationIds]
  const results = await Promise.all(
    reportIds.map(async (reportId) => processQueuedReportSafely(reportId))
  )

  return {
    attempted: reportIds.length,
    processed: results.filter((result) => result.status === "processed").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  }
}
