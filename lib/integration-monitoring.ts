import { createHash, randomUUID } from "node:crypto"
import { logError, sanitizeForLog } from "@/lib/safe-logger"

const REPORT_QUEUE_PREFIX = process.env.REPORT_QUEUE_PREFIX?.trim() || "greatgo"
const INTEGRATION_ALERTS_KEY = `${REPORT_QUEUE_PREFIX}:integration:alerts`
const INTEGRATION_ALERTS_DEDUPE_KEY = `${REPORT_QUEUE_PREFIX}:integration:alerts:dedupe`
const DEFAULT_ALERTS_RETENTION = 50
const DEFAULT_ALERT_DEDUPE_TTL_SECONDS = 60 * 60

export type IntegrationName = "meta-graph" | "meta-token" | "whatsapp"

export type IntegrationLogStatus = "success" | "failure"

export type IntegrationAlert = {
  id: string
  severity: "warning" | "error"
  integration: IntegrationName
  source: string
  message: string
  createdAt: string
  details: unknown
}

type RecordIntegrationAlertParams = Omit<IntegrationAlert, "id" | "createdAt"> & {
  dedupeKey?: string
}

function getAlertsRetention() {
  const value = Number.parseInt(process.env.INTEGRATION_ALERTS_RETENTION ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_ALERTS_RETENTION
  }

  return value
}

function getAlertDedupeTtlSeconds() {
  const value = Number.parseInt(
    process.env.INTEGRATION_ALERT_DEDUPE_TTL_SECONDS ?? "",
    10
  )

  if (!Number.isFinite(value) || value < 1) {
    return DEFAULT_ALERT_DEDUPE_TTL_SECONDS
  }

  return value
}

function buildAlert(params: Omit<IntegrationAlert, "id" | "createdAt">) {
  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...params,
  } satisfies IntegrationAlert
}

function buildAlertFingerprint(params: RecordIntegrationAlertParams) {
  return createHash("sha1")
    .update(
      JSON.stringify({
        integration: params.integration,
        source: params.source,
        severity: params.severity,
        message: params.message,
        dedupeKey: params.dedupeKey ?? null,
      })
    )
    .digest("hex")
}

async function shouldRecordAlert(params: RecordIntegrationAlertParams) {
  const { getRedisConnection } = await import("@/lib/redis")
  const fingerprint = buildAlertFingerprint(params)
  const redis = getRedisConnection("client")
  const result = await redis.set(
    `${INTEGRATION_ALERTS_DEDUPE_KEY}:${fingerprint}`,
    "1",
    "EX",
    getAlertDedupeTtlSeconds(),
    "NX"
  )

  return result === "OK"
}

export function logIntegrationEvent(params: {
  integration: IntegrationName
  action: string
  status: IntegrationLogStatus
  durationMs?: number
  details?: unknown
  error?: unknown
}) {
  const payload = sanitizeForLog({
    type: "integration_event",
    timestamp: new Date().toISOString(),
    integration: params.integration,
    action: params.action,
    status: params.status,
    durationMs: params.durationMs,
    details: params.details,
    error: params.error,
  })

  const message = JSON.stringify(payload)

  if (params.status === "failure") {
    console.error(message)
    return
  }

  console.info(message)
}

export async function recordIntegrationAlert(params: RecordIntegrationAlertParams) {
  const { getRedisConnection } = await import("@/lib/redis")
  const shouldPersist = await shouldRecordAlert(params)

  if (!shouldPersist) {
    return null
  }

  const alert = buildAlert({
    ...params,
    details: sanitizeForLog(params.details),
  })
  const redis = getRedisConnection("client")

  await redis.lpush(INTEGRATION_ALERTS_KEY, JSON.stringify(alert))
  await redis.ltrim(INTEGRATION_ALERTS_KEY, 0, getAlertsRetention() - 1)

  logIntegrationEvent({
    integration: params.integration,
    action: params.source,
    status: "failure",
    details: {
      severity: params.severity,
      message: params.message,
      details: params.details,
    },
  })

  return alert
}

export async function recordIntegrationAlertSafely(
  params: RecordIntegrationAlertParams
) {
  try {
    return await recordIntegrationAlert(params)
  } catch (error) {
    logError("integration-alert.record", error, {
      integration: params.integration,
      source: params.source,
    })

    return null
  }
}

export async function listRecentIntegrationAlerts(limit = 20) {
  const { getRedisConnection } = await import("@/lib/redis")
  const redis = getRedisConnection("client")
  const items = await redis.lrange(INTEGRATION_ALERTS_KEY, 0, Math.max(0, limit - 1))

  return items.flatMap((item) => {
    try {
      return [JSON.parse(item) as IntegrationAlert]
    } catch {
      return []
    }
  })
}
