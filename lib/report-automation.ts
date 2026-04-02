import { buildReferenceWeekDate } from "@/lib/report-domain"
import type {
  ReportObjectiveValue,
  ReportSendMode,
} from "@/types/report.types"

export const REPORT_AUTOMATION_DEFAULT_TIMEZONE = "America/Sao_Paulo"

const SUPPORTED_OBJECTIVES = new Set<ReportObjectiveValue>([
  "ALL",
  "LINK_CLICKS",
  "CONVERSIONS",
  "MESSAGES",
])

const SUPPORTED_SEND_MODES = new Set<ReportSendMode>([
  "PDF_AND_MESSAGE",
  "PDF_ONLY",
  "MESSAGE_ONLY",
])

export type ReportAutomationWindow = {
  since: string
  until: string
}

export type ReportAutomationSettings = {
  automationEmail: string | null
  timezone: string
  objective: ReportObjectiveValue
  sendMode: ReportSendMode
  groupId: string | null
  connectedOnly: boolean
  maxClients: number | null
  requestTimeoutSeconds: number
  requestMaxRetries: number
  retryBackoffSeconds: number
  pollingIntervalSeconds: number
  pollingMaxAttempts: number
  skipIfAlreadySent: boolean
}

function readEnvValue(
  env: Record<string, string | undefined>,
  name: string,
  fallbackName?: string
) {
  const value = env[name]?.trim()

  if (value) {
    return value
  }

  return fallbackName ? env[fallbackName]?.trim() || "" : ""
}

function readOptionalInt(
  env: Record<string, string | undefined>,
  name: string
) {
  const rawValue = readEnvValue(env, name)

  if (!rawValue) {
    return null
  }

  const value = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} precisa ser inteiro e maior que zero.`)
  }

  return value
}

function readPositiveInt(
  env: Record<string, string | undefined>,
  name: string,
  fallbackValue: number
) {
  const rawValue = readEnvValue(env, name)

  if (!rawValue) {
    return fallbackValue
  }

  const value = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(value) || value < 1) {
    throw new Error(`${name} precisa ser inteiro e maior que zero.`)
  }

  return value
}

function readPositiveFloat(
  env: Record<string, string | undefined>,
  name: string,
  fallbackValue: number
) {
  const rawValue = readEnvValue(env, name)

  if (!rawValue) {
    return fallbackValue
  }

  const value = Number.parseFloat(rawValue)

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} precisa ser numerico e maior que zero.`)
  }

  return value
}

function readBoolean(
  env: Record<string, string | undefined>,
  name: string,
  fallbackValue: boolean
) {
  const rawValue = readEnvValue(env, name)

  if (!rawValue) {
    return fallbackValue
  }

  return ["1", "true", "yes", "sim", "on"].includes(rawValue.toLowerCase())
}

function readObjective(
  env: Record<string, string | undefined>,
  name: string,
  fallbackValue: ReportObjectiveValue
) {
  const value = (readEnvValue(env, name) || fallbackValue).toUpperCase()

  if (!SUPPORTED_OBJECTIVES.has(value as ReportObjectiveValue)) {
    throw new Error(
      `${name} precisa ser um destes valores: ${[...SUPPORTED_OBJECTIVES].join(", ")}.`
    )
  }

  return value as ReportObjectiveValue
}

function readSendMode(
  env: Record<string, string | undefined>,
  name: string,
  fallbackValue: ReportSendMode
) {
  const value = (readEnvValue(env, name) || fallbackValue).toUpperCase()

  if (!SUPPORTED_SEND_MODES.has(value as ReportSendMode)) {
    throw new Error(
      `${name} precisa ser um destes valores: ${[...SUPPORTED_SEND_MODES].join(", ")}.`
    )
  }

  return value as ReportSendMode
}

function readOptionalEmail(
  env: Record<string, string | undefined>,
  name: string,
  fallbackName?: string
) {
  const value = readEnvValue(env, name, fallbackName)
  return value ? value.toLowerCase() : null
}

function validateIsoDate(value: string) {
  const date = new Date(`${value}T00:00:00`)

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Data invalida '${value}'. Use o formato YYYY-MM-DD.`)
  }
}

export function loadReportAutomationSettings(
  env: Record<string, string | undefined> = process.env
): ReportAutomationSettings {
  return {
    automationEmail: readOptionalEmail(
      env,
      "REPORT_AUTOMATION_EMAIL",
      "ADMIN_EMAIL"
    ),
    timezone:
      readEnvValue(env, "REPORT_AUTOMATION_TIMEZONE") ||
      REPORT_AUTOMATION_DEFAULT_TIMEZONE,
    objective: readObjective(env, "REPORT_AUTOMATION_OBJECTIVE", "ALL"),
    sendMode: readSendMode(
      env,
      "REPORT_AUTOMATION_SEND_MODE",
      "PDF_AND_MESSAGE"
    ),
    groupId: readEnvValue(env, "REPORT_AUTOMATION_GROUP_ID") || null,
    connectedOnly: readBoolean(env, "REPORT_AUTOMATION_CONNECTED_ONLY", true),
    maxClients: readOptionalInt(env, "REPORT_AUTOMATION_MAX_CLIENTS"),
    requestTimeoutSeconds: readPositiveFloat(
      env,
      "REPORT_AUTOMATION_REQUEST_TIMEOUT_SECONDS",
      30
    ),
    requestMaxRetries: readPositiveInt(
      env,
      "REPORT_AUTOMATION_REQUEST_MAX_RETRIES",
      3
    ),
    retryBackoffSeconds: readPositiveFloat(
      env,
      "REPORT_AUTOMATION_RETRY_BACKOFF_SECONDS",
      3
    ),
    pollingIntervalSeconds: readPositiveFloat(
      env,
      "REPORT_AUTOMATION_POLL_INTERVAL_SECONDS",
      5
    ),
    pollingMaxAttempts: readPositiveInt(
      env,
      "REPORT_AUTOMATION_POLL_MAX_ATTEMPTS",
      24
    ),
    skipIfAlreadySent: readBoolean(
      env,
      "REPORT_AUTOMATION_SKIP_IF_ALREADY_SENT",
      true
    ),
  }
}

export function resolveReportAutomationWindow(params: {
  timezone: string
  since?: string | null
  until?: string | null
  referenceDate?: Date
}) {
  const { timezone, since, until, referenceDate = new Date() } = params

  if (Boolean(since) !== Boolean(until)) {
    throw new Error("Informe --since e --until juntos.")
  }

  if (since && until) {
    validateIsoDate(since)
    validateIsoDate(until)

    if (since > until) {
      throw new Error("--until precisa ser maior ou igual a --since.")
    }

    return {
      since,
      until,
    } satisfies ReportAutomationWindow
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const today = formatter.format(referenceDate)
  const currentDate = new Date(`${today}T00:00:00Z`)
  const weekDay = currentDate.getUTCDay() || 7
  const currentWeekStart = new Date(currentDate)
  currentWeekStart.setUTCDate(currentWeekStart.getUTCDate() - (weekDay - 1))
  const previousWeekStart = new Date(currentWeekStart)
  previousWeekStart.setUTCDate(previousWeekStart.getUTCDate() - 7)
  const previousWeekEnd = new Date(currentWeekStart)
  previousWeekEnd.setUTCDate(previousWeekEnd.getUTCDate() - 1)

  return {
    since: previousWeekStart.toISOString().slice(0, 10),
    until: previousWeekEnd.toISOString().slice(0, 10),
  } satisfies ReportAutomationWindow
}

export function buildAutomationReferenceWeekLabel(
  window: ReportAutomationWindow
) {
  return `${window.since} até ${window.until}`
}

export function buildAutomationReferenceWeekDate(
  window: ReportAutomationWindow
) {
  return buildReferenceWeekDate(window.since)
}

export function maskAutomationGroupId(groupId: string | null | undefined) {
  if (!groupId) {
    return null
  }

  const normalized = groupId.trim()

  if (normalized.length <= 8) {
    return "***"
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-4)}`
}
