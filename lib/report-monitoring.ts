import { randomUUID } from "node:crypto"
import type { Job } from "bullmq"
import {
  enqueueDeadLetterJob,
  getReportDeadLetterQueue,
  getReportGenerationQueue,
  getReportQueuePrefix,
  getReportSendQueue,
  getReportWeeklyQueue,
  REPORT_WEEKLY_SCHEDULER_ID,
} from "@/lib/report-queue"
import { listRecentIntegrationAlerts } from "@/lib/integration-monitoring"
import { getRedisConnection } from "@/lib/redis"
import { logError, sanitizeForLog } from "@/lib/safe-logger"

const REPORT_ALERTS_KEY = `${getReportQueuePrefix()}:report:alerts`
const ALERTS_RETENTION = 50

export type ReportOperationalAlert = {
  id: string
  severity: "warning" | "error"
  source: string
  queueName: string | null
  message: string
  createdAt: string
  jobId: string | null
  jobName: string | null
  details: unknown
}

type ReportQueueCounts = Awaited<
  ReturnType<ReturnType<typeof getReportGenerationQueue>["getJobCounts"]>
>

function getAlertsRetention() {
  const value = Number.parseInt(process.env.REPORT_ALERTS_RETENTION ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return ALERTS_RETENTION
  }

  return value
}

function buildAlert(params: Omit<ReportOperationalAlert, "id" | "createdAt">) {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...params,
  } satisfies ReportOperationalAlert
}

export async function recordReportAlert(
  params: Omit<ReportOperationalAlert, "id" | "createdAt">
) {
  const alert = buildAlert({
    ...params,
    details: sanitizeForLog(params.details),
  })

  const redis = getRedisConnection("client")
  await redis.lpush(REPORT_ALERTS_KEY, JSON.stringify(alert))
  await redis.ltrim(REPORT_ALERTS_KEY, 0, getAlertsRetention() - 1)

  logError(`report-alert.${params.source}`, new Error(params.message), {
    queueName: params.queueName,
    jobId: params.jobId,
    jobName: params.jobName,
    details: params.details,
  })

  return alert
}

export async function listRecentReportAlerts(limit = 20) {
  const redis = getRedisConnection("client")
  const items = await redis.lrange(REPORT_ALERTS_KEY, 0, Math.max(0, limit - 1))

  return items.flatMap((item) => {
    try {
      return [JSON.parse(item) as ReportOperationalAlert]
    } catch {
      return []
    }
  })
}

export async function handleTerminalJobFailure(
  queueName: string,
  job: Job | undefined,
  error: unknown
) {
  const attemptsConfigured = job?.opts.attempts ?? 1
  const attemptsMade = job?.attemptsMade ?? 0
  const isTerminalFailure = attemptsMade >= attemptsConfigured
  const message =
    error instanceof Error ? error.message : "Falha inesperada no job"

  await recordReportAlert({
    severity: isTerminalFailure ? "error" : "warning",
    source: "worker-failed",
    queueName,
    message: isTerminalFailure
      ? "Job esgotou as tentativas e foi encaminhado para a dead letter queue."
      : "Job falhou, mas ainda possui novas tentativas configuradas.",
    jobId: job?.id ? String(job.id) : null,
    jobName: job?.name ?? null,
    details: {
      attemptsMade,
      attemptsConfigured,
      errorMessage: message,
      payload: job?.data,
    },
  })

  if (!job || !isTerminalFailure) {
    return
  }

  await enqueueDeadLetterJob({
    queueName,
    jobId: String(job.id),
    jobName: job.name,
    errorMessage: message,
    failedAt: new Date().toISOString(),
    attemptsMade,
    attemptsConfigured,
    payload: sanitizeForLog(job.data),
  })
}

async function getCounts(queue: {
  getJobCounts: (
    ...types: Array<
      "waiting" | "active" | "completed" | "failed" | "delayed" | "paused"
    >
  ) => Promise<ReportQueueCounts>
}) {
  return queue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused"
  )
}

export async function getReportQueuesHealth() {
  const [generation, send, weekly, deadLetter, scheduler, alerts, integrationAlerts] =
    await Promise.all([
      getCounts(getReportGenerationQueue()),
      getCounts(getReportSendQueue()),
      getCounts(getReportWeeklyQueue()),
      getCounts(getReportDeadLetterQueue()),
      getReportWeeklyQueue().getJobScheduler(REPORT_WEEKLY_SCHEDULER_ID),
      listRecentReportAlerts(10),
      listRecentIntegrationAlerts(10),
    ])

  return {
    ok:
      Boolean(scheduler) &&
      (deadLetter.waiting ?? 0) === 0 &&
      (deadLetter.delayed ?? 0) === 0 &&
      alerts.every((alert) => alert.severity !== "error") &&
      integrationAlerts.every((alert) => alert.severity !== "error"),
    checkedAt: new Date().toISOString(),
    scheduler: scheduler
      ? {
          id: scheduler.key,
          next: scheduler.next,
          pattern: scheduler.pattern ?? null,
        }
      : null,
    queues: {
      generation,
      send,
      weekly,
      deadLetter,
    },
    alerts,
    integrationAlerts,
  }
}
