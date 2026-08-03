import { jsPDF } from "jspdf"
import { buildStandardReportPdfBuffer } from "@/lib/report-pdf-standard"
import { logError } from "@/lib/safe-logger"
import type { StoredReportPayload } from "@/types/report.types"

function normalizePayload(payload: StoredReportPayload): StoredReportPayload {
  return {
    ...payload,
    client: {
      ...payload.client,
      name: payload.client.name || "Cliente não informado",
    },
    filters: {
      ...payload.filters,
      since: payload.filters.since || "",
      until: payload.filters.until || "",
      objective: payload.filters.objective || "ALL",
      generatedAt: payload.filters.generatedAt || new Date().toISOString(),
    },
    campaigns: Array.isArray(payload.campaigns)
      ? payload.campaigns.map((campaign, index) => ({
          ...campaign,
          id: campaign.id || `campaign-${index + 1}`,
          name: campaign.name || `Campanha ${index + 1}`,
          status: campaign.status || "ACTIVE",
        }))
      : [],
    accountInsights: payload.accountInsights ?? undefined,
    dailyInsights: payload.dailyInsights ?? [],
    topAds: payload.topAds ?? [],
    genderBreakdown: payload.genderBreakdown ?? [],
    presentation: payload.presentation ?? undefined,
  }
}

function buildEmergencyReportPdfBuffer(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  const safePayload = normalizePayload(params.payload)

  pdf.setDocumentProperties({
    title: `Relatório META Ads | ${safePayload.client.name}`,
    subject: "Relatório de performance META Ads",
    author: "GreatGo",
    creator: "GreatGo",
    keywords: ["greatgo", "meta ads", safePayload.client.name, params.reportId].join(", "),
  })

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(22)
  pdf.text("Relatório", 20, 25)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.text("Não foi possível renderizar a versão completa do PDF. Foi gerada uma versão de contingência.", 20, 35, {
    maxWidth: 170,
  })

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(12)
  pdf.text("Cliente", 20, 52)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.text(safePayload.client.name, 20, 60)

  pdf.setFont("helvetica", "bold")
  pdf.text("Período", 20, 74)
  pdf.setFont("helvetica", "normal")
  pdf.text(`${safePayload.filters.since || "-"} a ${safePayload.filters.until || "-"}`, 20, 82)

  pdf.setFont("helvetica", "bold")
  pdf.text("Status", 20, 96)
  pdf.setFont("helvetica", "normal")
  pdf.text("Arquivo PDF gerado com fallback seguro.", 20, 104)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.text(`Referência: ${params.reportId}`, 20, 280)

  return new Uint8Array(pdf.output("arraybuffer"))
}

export async function buildReportPdfBufferWithFallback(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  try {
    return buildStandardReportPdfBuffer({
      reportId: params.reportId,
      payload: params.payload,
    })
  } catch (error) {
    logError("report-pdf-fallback.standard-fallback", error, {
      reportId: params.reportId,
    })

    try {
      return buildStandardReportPdfBuffer({
        reportId: params.reportId,
        payload: normalizePayload(params.payload),
      })
    } catch (normalizedError) {
      logError("report-pdf-fallback.emergency-fallback", normalizedError, {
        reportId: params.reportId,
      })

      return buildEmergencyReportPdfBuffer({
        reportId: params.reportId,
        payload: params.payload,
      })
    }
  }
}
