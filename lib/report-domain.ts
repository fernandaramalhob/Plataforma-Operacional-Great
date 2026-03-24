import { Prisma, ReportStatus, SendLog } from "@prisma/client"
import type {
  HistoryRow,
  ReportFilters,
  ReportPayload,
  StoredReportPayload,
} from "@/types/report.types"

type SendLogLike = Pick<SendLog, "attemptNumber" | "sentAt" | "errorMessage">

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR")
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function buildStoredReportPayload(
  payload: ReportPayload,
  filters: Omit<ReportFilters, "generatedAt">,
  generatedAt: Date
): StoredReportPayload {
  return {
    ...payload,
    client: payload.client ?? {
      id: "",
      name: "Cliente nao informado",
      company: null,
      adAccountId: null,
    },
    filters: {
      ...filters,
      generatedAt: generatedAt.toISOString(),
    },
  }
}

export function serializeStoredReportPayload(payload: StoredReportPayload) {
  return payload as Prisma.InputJsonValue
}

export function parseStoredReportPayload(
  payloadJson: Prisma.JsonValue | null
): StoredReportPayload | null {
  if (!isRecord(payloadJson)) {
    return null
  }

  const client = payloadJson.client
  const filters = payloadJson.filters
  const campaigns = payloadJson.campaigns

  if (!isRecord(client) || !isRecord(filters) || !Array.isArray(campaigns)) {
    return null
  }

  if (
    typeof client.id !== "string" ||
    typeof client.name !== "string" ||
    typeof filters.since !== "string" ||
    typeof filters.until !== "string" ||
    typeof filters.objective !== "string" ||
    typeof filters.generatedAt !== "string"
  ) {
    return null
  }

  return payloadJson as unknown as StoredReportPayload
}

export function buildReferenceWeekDate(date: string) {
  return new Date(`${date}T03:00:00.000Z`)
}

export function getHistoryStatusFilter(
  value: string | null
): ReportStatus | undefined {
  if (value === "Enviado") {
    return "SENT"
  }

  if (value === "Falha") {
    return "FAILED"
  }

  if (value === "Pendente") {
    return "PENDING"
  }

  return undefined
}

export function mapReportToHistoryRow(report: {
  id: string
  clientId: string
  generatedAt: Date
  referenceWeek: Date
  status: ReportStatus
  payloadJson: Prisma.JsonValue | null
  client: {
    name: string
    company: string | null
  }
  sendLogs: SendLogLike[]
}): HistoryRow {
  const payload = parseStoredReportPayload(report.payloadJson)
  const latestLog = [...report.sendLogs].sort(
    (left, right) => right.attemptNumber - left.attemptNumber
  )[0]
  const attempts = latestLog?.attemptNumber ?? 0
  const referenceWeek = payload
    ? `${payload.filters.since} ate ${payload.filters.until}`
    : formatDate(report.referenceWeek)

  return {
    id: report.id,
    date: formatDate(report.generatedAt),
    time: formatTime(report.generatedAt),
    clientId: report.clientId,
    client: report.client.name,
    company: report.client.company ?? "-",
    status: report.status,
    attempts,
    errorMessage: latestLog?.errorMessage ?? null,
    referenceWeek,
  }
}
