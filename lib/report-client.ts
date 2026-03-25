import { fetchJsonOrThrow } from "@/lib/api-client"
import type {
  QueuedReportResponse,
  ReportRequest,
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
    "Erro ao buscar relatorio"
  )
}

export async function loadSavedReport(
  reportId: string,
  fallbackMessage = "Nao foi possivel carregar o relatorio"
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
  fallbackMessage = "Nao foi possivel carregar o relatorio",
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
    "A fila ainda esta processando este relatorio. Tente novamente em instantes."
  )
}

export async function sendReportToWhatsApp(reportId: string) {
  return fetchJsonOrThrow<ReportSendResponse>(
    `/api/reports/${reportId}/send`,
    {
      method: "POST",
    },
    "Nao foi possivel enviar o relatorio"
  )
}
