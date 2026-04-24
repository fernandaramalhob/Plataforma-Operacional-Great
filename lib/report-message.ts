import type { StoredReportPayload } from "@/types/report.types"
import {
  findBestCampaignByObjective,
  formatCurrency,
  formatInteger,
  formatPercentage,
  parseReportNumber,
  resolveObjectiveMetric,
} from "@/lib/report-metrics"

function formatDate(date: string) {
  if (!date) {
    return "-"
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
}

export function buildWhatsAppReportMessageFromPayload(params: {
  payload: StoredReportPayload
}) {
  const { payload } = params
  const accountInsights = payload.accountInsights ?? {}
  const spend = parseReportNumber(accountInsights.spend)
  const impressions = parseReportNumber(accountInsights.impressions)
  const reach = parseReportNumber(accountInsights.reach)
  const clicks = parseReportNumber(accountInsights.clicks)
  const ctr = parseReportNumber(accountInsights.ctr)
  const objectiveMetric = resolveObjectiveMetric(
    accountInsights,
    payload.filters.objective
  )
  const bestCampaign =
    findBestCampaignByObjective(payload.campaigns, payload.filters.objective) ??
    payload.campaigns[0] ??
    null

  return [
    "*GreatGo | Relatorio META Ads*",
    `Cliente: ${payload.client.name}`,
    `Periodo: ${formatDate(payload.filters.since)} ate ${formatDate(payload.filters.until)}`,
    "",
    `Investimento: ${formatCurrency(spend)}`,
    `Impressões: ${formatInteger(impressions)}`,
    `Alcance: ${formatInteger(reach)}`,
    `Cliques: ${formatInteger(clicks)}`,
    `CTR: ${formatPercentage(ctr)}`,
    `${objectiveMetric.label}: ${formatInteger(objectiveMetric.value)}`,
    objectiveMetric.costPerResult !== null
      ? `${objectiveMetric.costLabel}: ${formatCurrency(objectiveMetric.costPerResult)}`
      : null,
    objectiveMetric.efficiencyLabel === "ROAS" &&
    objectiveMetric.efficiencyValue !== null
      ? `ROAS: ${objectiveMetric.efficiencyValue.toFixed(2)}x`
      : objectiveMetric.efficiencyLabel && objectiveMetric.efficiencyValue !== null
        ? `${objectiveMetric.efficiencyLabel}: ${formatPercentage(objectiveMetric.efficiencyValue)}`
        : null,
    objectiveMetric.valueLabel && objectiveMetric.valueAmount > 0
      ? `${objectiveMetric.valueLabel}: ${formatCurrency(objectiveMetric.valueAmount)}`
      : null,
    `Campanhas no relatorio: ${payload.campaigns.length}`,
    bestCampaign ? `Melhor campanha: ${bestCampaign.name}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
}

export function buildWhatsAppReportMessage(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  return buildWhatsAppReportMessageFromPayload({
    payload: params.payload,
  })
}

export function buildReportSendPreview(params: {
  reportId?: string | null
  payload: StoredReportPayload
  message?: string | null
}) {
  const defaultMessage =
    params.payload.uiMessageOverride?.trim() ||
    buildWhatsAppReportMessageFromPayload({
      payload: params.payload,
    })

  return params.message?.trim() || defaultMessage
}
