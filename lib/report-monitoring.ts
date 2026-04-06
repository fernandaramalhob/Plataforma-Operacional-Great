import { randomUUID } from "node:crypto"
import { prisma } from "@/lib/prisma"
import {
  parsePendingReportJobPayload,
  parseReportJobErrorPayload,
} from "@/lib/report-domain"
import { listRecentIntegrationAlerts } from "@/lib/integration-monitoring"
import { getRedisConnection, isRedisConfigured } from "@/lib/redis"
import { logError, sanitizeForLog } from "@/lib/safe-logger"

const REPORT_QUEUE_PREFIX = process.env.REPORT_QUEUE_PREFIX?.trim() || "greatgo"
const REPORT_ALERTS_KEY = `${REPORT_QUEUE_PREFIX}:report:alerts`
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

type ReportQueueCounts = {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: number
}

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

  if (isRedisConfigured()) {
    const redis = getRedisConnection("client")
    await redis.lpush(REPORT_ALERTS_KEY, JSON.stringify(alert))
    await redis.ltrim(REPORT_ALERTS_KEY, 0, getAlertsRetention() - 1)
  }

  logError(`report-alert.${params.source}`, new Error(params.message), {
    queueName: params.queueName,
    jobId: params.jobId,
    jobName: params.jobName,
    details: params.details,
  })

  return alert
}

export async function listRecentReportAlerts(limit = 20) {
  if (!isRedisConfigured()) {
    return []
  }

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

async function listPendingGenerationReports() {
  const candidates = await prisma.report.findMany({
    where: {
      status: "PENDING",
    },
    select: {
      id: true,
      payloadJson: true,
    },
    take: 200,
    orderBy: {
      generatedAt: "asc",
    },
  })

  return candidates.filter((candidate) =>
    Boolean(parsePendingReportJobPayload(candidate.payloadJson))
  )
}

async function countFailedGenerationReports() {
  const recentReports = await prisma.report.findMany({
    where: {
      status: "FAILED",
    },
    select: {
      payloadJson: true,
    },
    take: 200,
    orderBy: {
      generatedAt: "desc",
    },
  })

  return recentReports.filter((report) => {
    const jobError = parseReportJobErrorPayload(report.payloadJson)
    return jobError?.stage === "GENERATION"
  }).length
}

async function countFailedSendReports() {
  return prisma.sendLog.count({
    where: {
      status: "FAILED",
    },
  })
}

async function countDueSchedules() {
  return prisma.reportSchedule.count({
    where: {
      active: true,
      nextRunAt: {
        lte: new Date(),
      },
    },
  })
}

function buildQueueCounts(params?: Partial<ReportQueueCounts>): ReportQueueCounts {
  return {
    waiting: params?.waiting ?? 0,
    active: params?.active ?? 0,
    completed: params?.completed ?? 0,
    failed: params?.failed ?? 0,
    delayed: params?.delayed ?? 0,
    paused: params?.paused ?? 0,
  }
}

export async function getReportQueuesHealth() {
  const [pendingGeneration, failedGeneration, failedSend, dueSchedules, alerts, integrationAlerts] =
    await Promise.all([
      listPendingGenerationReports(),
      countFailedGenerationReports(),
      countFailedSendReports(),
      countDueSchedules(),
      listRecentReportAlerts(10),
      listRecentIntegrationAlerts(10),
    ])

  const schedulerConfigured = Boolean(process.env.CRON_SECRET?.trim())

  return {
    ok:
      schedulerConfigured &&
      failedGeneration === 0 &&
      failedSend === 0 &&
      alerts.every((alert) => alert.severity !== "error") &&
      integrationAlerts.every((alert) => alert.severity !== "error"),
    checkedAt: new Date().toISOString(),
    scheduler: schedulerConfigured
      ? {
          id: "vercel-cron-report-jobs",
          next: null,
          pattern: "* * * * *",
        }
      : null,
    queues: {
      generation: buildQueueCounts({
        waiting: pendingGeneration.length,
        failed: failedGeneration,
      }),
      send: buildQueueCounts({
        failed: failedSend,
      }),
      weekly: buildQueueCounts({
        waiting: dueSchedules,
      }),
      deadLetter: buildQueueCounts(),
    },
    alerts,
    integrationAlerts,
  }
}
