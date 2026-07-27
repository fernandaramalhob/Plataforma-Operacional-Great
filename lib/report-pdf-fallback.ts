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

    return buildStandardReportPdfBuffer({
      reportId: params.reportId,
      payload: normalizePayload(params.payload),
    })
  }
}