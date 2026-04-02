import { fetchJsonOrThrow } from "@/lib/api-client"
import type {
  ReportSendRequest,
  QueuedReportResponse,
  ReportRequest,
  ReportSchedulePayload,
  ReportScheduleResponse,
  ReportSendResponse,
  SavedReportResponse,
} from "@/types/report.types"

type PollSavedReportOptions = {
  reportId: string
  sequence: number
  getCurrentSequence: () => number
  sleep: (milliseconds: number) => Promise<void>
  onUpdate?: (report: SavedReportResponse) => void
  maxAttempts?: number
  intervalMs?: number
  fallbackMessage?: string
}

export async function requestQueuedReport(payload: ReportRequest) {
  return fetchJsonOrThrow<QueuedReportResponse>(
    "/api/reports",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "Erro ao buscar relatório"
  )
}

export async function loadSavedReport(
  reportId: string,
  fallbackMessage = "Não foi possível carregar o relatório"
) {
  return fetchJsonOrThrow<SavedReportResponse>(
    `/api/reports/${reportId}`,
    {
      cache: "no-store",
    },
    fallbackMessage
  )
}

export async function pollSavedReportUntilReady({
  reportId,
  sequence,
  getCurrentSequence,
  sleep,
  onUpdate,
  maxAttempts = 24,
  intervalMs = 2_500,
  fallbackMessage = "Não foi possível carregar o relatório",
}: PollSavedReportOptions): Promise<SavedReportResponse | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const report = await loadSavedReport(reportId, fallbackMessage)

    if (sequence !== getCurrentSequence()) {
      return null
    }

    onUpdate?.(report)

    if (report.payload || report.status === "FAILED") {
      return report
    }

    await sleep(intervalMs)
  }

  throw new Error(
    "A fila ainda esta processando este relatório. Tente novamente em instantes."
  )
}

export async function sendReportToWhatsApp(
  reportId: string,
  payload?: ReportSendRequest
) {
  return fetchJsonOrThrow<ReportSendResponse>(
    `/api/reports/${reportId}/send`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload ?? {}),
    },
    "Não foi possível enviar o relatório"
  )
}

export async function loadClientReportSchedule(clientId: string) {
  return fetchJsonOrThrow<{ schedule: ReportScheduleResponse | null }>(
    `/api/clients/${clientId}/report-schedule`,
    {
      cache: "no-store",
    },
    "NÃ£o foi possÃ­vel carregar o agendamento"
  )
}

export async function saveClientReportSchedule(
  clientId: string,
  payload: ReportSchedulePayload
) {
  return fetchJsonOrThrow<{ ok: true; schedule: ReportScheduleResponse }>(
    `/api/clients/${clientId}/report-schedule`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    "NÃ£o foi possÃ­vel salvar o agendamento"
  )
}

export async function disableClientSavedReportSchedule(clientId: string) {
  return fetchJsonOrThrow<{ ok?: true; schedule: ReportScheduleResponse | null }>(
    `/api/clients/${clientId}/report-schedule`,
    {
      method: "DELETE",
    },
    "NÃ£o foi possÃ­vel desativar o agendamento"
  )
}
