import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  buildReferenceWeekDate,
  buildReportJobErrorPayload,
  buildStoredReportPayload,
  parsePendingReportJobPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import {
  recordReportAlert,
} from "@/lib/report-monitoring"
import { getRedisConnection, isRedisConfigured } from "@/lib/redis"
import {
  generateLiveReportPayload,
} from "@/lib/report-service"
import { recordIntegrationAlertSafely } from "@/lib/integration-monitoring"
import { logError } from "@/lib/safe-logger"

type QueuedReportResult =
  | { status: "processed"; reportId: string }
  | { status: "failed"; reportId: string; message: string }
  | { status: "skipped"; reportId: string; reason: string }
  | { status: "missing"; reportId: string }

const DEFAULT_PROCESS_LOCK_TTL_MS = 5 * 60 * 1000
const DEFAULT_BATCH_SIZE = 5

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

async function markGenerationFailure(params: {
  reportId: string
  message: string
  pendingJob: NonNullable<ReturnType<typeof parsePendingReportJobPayload>>
}) {
  await prisma.report.update({
    where: { id: params.reportId },
    data: {
      status: "FAILED",
      payloadJson: buildReportJobErrorPayload(params.message, "GENERATION"),
    },
  })

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
    },
  }).catch((error) => {
    logError("report-processing.alert.generation", error, {
      reportId: params.reportId,
    })
  })
}

async function markSendFailure(params: {
  reportId: string
  message: string
  pendingJob: NonNullable<ReturnType<typeof parsePendingReportJobPayload>>
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
    },
  })
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

    const user = await loadRequestedByUser(pendingJob.requestedByUserId)

    if (!user) {
      const message = "Usuario responsavel pelo relatorio nao foi encontrado"
      await markGenerationFailure({
        reportId,
        message,
        pendingJob,
      })
      return { status: "failed" as const, reportId, message }
    }

    try {
      const payload = await generateLiveReportPayload({
        user,
        client: report.client,
        filters: pendingJob.filters,
      })
      const generatedAt = new Date()
      const storedPayload = buildStoredReportPayload(
        payload,
        pendingJob.filters,
        generatedAt
      )

      await prisma.report.update({
        where: { id: report.id },
        data: {
          generatedAt,
          referenceWeek: buildReferenceWeekDate(pendingJob.filters.since),
          status: "PENDING",
          payloadJson: serializeStoredReportPayload(storedPayload),
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao gerar relatorio"

      logError("report-processing.generate", error, {
        reportId,
        source: pendingJob.source,
      })

      await markGenerationFailure({
        reportId,
        message,
        pendingJob,
      })

      return { status: "failed" as const, reportId, message }
    }

    if (!pendingJob.enqueueSendOnComplete) {
      return { status: "processed" as const, reportId }
    }

    try {
      await sendPersistedReportNow(report.id, {
        mode: pendingJob.sendOptions?.mode,
        message: pendingJob.sendOptions?.message,
        groupId: pendingJob.sendOptions?.groupId,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao enviar relatorio"

      logError("report-processing.send", error, {
        reportId,
        source: pendingJob.source,
      })

      await markSendFailure({
        reportId,
        message,
        pendingJob,
      })

      return { status: "failed" as const, reportId, message }
    }

    return { status: "processed" as const, reportId }
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
    take: Math.max(limit * 5, limit),
  })

  return candidates
    .filter((candidate) => parsePendingReportJobPayload(candidate.payloadJson))
    .slice(0, limit)
    .map((candidate) => candidate.id)
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
