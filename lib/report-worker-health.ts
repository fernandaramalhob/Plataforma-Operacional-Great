import { prisma } from "@/lib/prisma"

export const REPORT_WORKER_HEARTBEAT_ID = "report-schedule-worker"

const DEFAULT_STALE_AFTER_MINUTES = 10
const DEFAULT_ALERT_COOLDOWN_MINUTES = 12 * 60

export type ReportWorkerHealthStatus =
  | "RUNNING"
  | "DEGRADED"
  | "STALE"
  | "MISSING"

export type ReportWorkerHealth = {
  ok: boolean
  status: ReportWorkerHealthStatus
  severity: "warning" | "error" | null
  checkedAt: string
  detail: string
  lastHeartbeatAt: string | null
  lastError: string | null
  lastAlertAt: string | null
  staleAfterMinutes: number
  alertCooldownMinutes: number
}

function readPositiveIntEnv(name: string, fallback: number) {
  const rawValue = process.env[name]?.trim()

  if (!rawValue) {
    return fallback
  }

  const parsed = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return parsed
}

export function getReportWorkerStaleAfterMinutes() {
  return readPositiveIntEnv(
    "REPORT_WORKER_HEARTBEAT_STALE_MINUTES",
    DEFAULT_STALE_AFTER_MINUTES
  )
}

export function getReportWorkerAlertCooldownMinutes() {
  return readPositiveIntEnv(
    "REPORT_WORKER_ALERT_COOLDOWN_MINUTES",
    DEFAULT_ALERT_COOLDOWN_MINUTES
  )
}

export async function touchReportWorkerHeartbeat(params?: {
  at?: Date
  lastError?: string | null
}) {
  const now = params?.at ?? new Date()

  return prisma.reportWorkerHeartbeat.upsert({
    where: {
      id: REPORT_WORKER_HEARTBEAT_ID,
    },
    create: {
      id: REPORT_WORKER_HEARTBEAT_ID,
      startedAt: now,
      lastHeartbeatAt: now,
      lastError: params?.lastError?.trim() || null,
      lastAlertAt: null,
    },
    update: {
      lastHeartbeatAt: now,
      lastError: params?.lastError?.trim() || null,
    },
  })
}

export async function markReportWorkerAlertSent(at = new Date()) {
  return prisma.reportWorkerHeartbeat.updateMany({
    where: {
      id: REPORT_WORKER_HEARTBEAT_ID,
    },
    data: {
      lastAlertAt: at,
    },
  })
}

export async function readReportWorkerHeartbeat() {
  return prisma.reportWorkerHeartbeat.findUnique({
    where: {
      id: REPORT_WORKER_HEARTBEAT_ID,
    },
  })
}

export function shouldRecordReportWorkerAlert(
  health: Pick<ReportWorkerHealth, "status" | "lastAlertAt">,
  now = new Date()
) {
  if (health.status !== "STALE" && health.status !== "MISSING") {
    return false
  }

  if (!health.lastAlertAt) {
    return true
  }

  const alertAtMs = new Date(health.lastAlertAt).getTime()
  const cooldownMs = getReportWorkerAlertCooldownMinutes() * 60_000

  return Number.isFinite(alertAtMs) && now.getTime() - alertAtMs >= cooldownMs
}

export async function getReportWorkerHealth(
  now = new Date()
): Promise<ReportWorkerHealth> {
  const heartbeat = await readReportWorkerHeartbeat()
  const staleAfterMinutes = getReportWorkerStaleAfterMinutes()
  const alertCooldownMinutes = getReportWorkerAlertCooldownMinutes()
  const heartbeatAt = heartbeat?.lastHeartbeatAt ?? null
  const heartbeatMs = heartbeatAt?.getTime() ?? NaN
  const staleMs = staleAfterMinutes * 60_000
  const recentHeartbeat =
    Number.isFinite(heartbeatMs) && now.getTime() - heartbeatMs <= staleMs
  const lastError = heartbeat?.lastError?.trim() || null
  const lastAlertAt = heartbeat?.lastAlertAt?.toISOString() ?? null

  if (!heartbeat) {
    return {
      ok: false,
      status: "MISSING",
      severity: "error",
      checkedAt: now.toISOString(),
      detail:
        "O worker continuo de agendamentos ainda nao enviou heartbeat.",
      lastHeartbeatAt: null,
      lastError: null,
      lastAlertAt: null,
      staleAfterMinutes,
      alertCooldownMinutes,
    }
  }

  if (!recentHeartbeat) {
    return {
      ok: false,
      status: "STALE",
      severity: "error",
      checkedAt: now.toISOString(),
      detail:
        "O worker continuo de agendamentos parou de responder dentro da janela esperada.",
      lastHeartbeatAt: heartbeatAt?.toISOString() ?? null,
      lastError,
      lastAlertAt,
      staleAfterMinutes,
      alertCooldownMinutes,
    }
  }

  if (lastError) {
    return {
      ok: true,
      status: "DEGRADED",
      severity: "warning",
      checkedAt: now.toISOString(),
      detail:
        `O worker continuo respondeu recentemente, mas o ultimo ciclo registrou erro: ${lastError}`,
      lastHeartbeatAt: heartbeatAt?.toISOString() ?? null,
      lastError,
      lastAlertAt,
      staleAfterMinutes,
      alertCooldownMinutes,
    }
  }

  return {
    ok: true,
    status: "RUNNING",
    severity: null,
    checkedAt: now.toISOString(),
    detail: "O worker continuo de agendamentos esta respondendo normalmente.",
    lastHeartbeatAt: heartbeatAt?.toISOString() ?? null,
    lastError: null,
    lastAlertAt,
    staleAfterMinutes,
    alertCooldownMinutes,
  }
}
