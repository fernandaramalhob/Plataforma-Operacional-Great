import type {
  ReportAction,
  ReportCampaign,
  StoredReportPayload,
} from "@/types/report.types"

function getActionValue(actions: ReportAction[] | undefined, type: string) {
  return actions?.find((action) => action.action_type === type)?.value ?? "0"
}

function parseNumber(value?: string) {
  return Number.parseFloat(value ?? "0") || 0
}

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  })
}

function formatInteger(value: number) {
  return value.toLocaleString("pt-BR")
}

function formatDate(date: string) {
  if (!date) {
    return "-"
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
}

function findBestCampaign(campaigns: ReportCampaign[]) {
  if (!campaigns.length) {
    return null
  }

  return campaigns.reduce((best, current) => {
    const bestClicks = parseNumber(best.insights?.data?.[0]?.clicks)
    const currentClicks = parseNumber(current.insights?.data?.[0]?.clicks)

    return currentClicks > bestClicks ? current : best
  }, campaigns[0])
}

export function buildWhatsAppReportMessage(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  const { reportId, payload } = params
  const accountInsights = payload.accountInsights ?? {}
  const spend = parseNumber(accountInsights.spend)
  const impressions = parseNumber(accountInsights.impressions)
  const reach = parseNumber(accountInsights.reach)
  const clicks = parseNumber(accountInsights.clicks)
  const ctr = parseNumber(accountInsights.ctr)
  const conversions = parseNumber(
    getActionValue(accountInsights.actions, "offsite_conversion.fb_pixel_purchase")
  )
  const bestCampaign = findBestCampaign(payload.campaigns)
  const reportUrlBase = process.env.NEXTAUTH_URL?.replace(/\/+$/, "")
  const reportUrl = reportUrlBase
    ? `${reportUrlBase}/dashboard/reports/${reportId}`
    : null

  return [
    "*GreatGo | Relatorio META Ads*",
    `Cliente: ${payload.client.name}`,
    `Periodo: ${formatDate(payload.filters.since)} ate ${formatDate(payload.filters.until)}`,
    "",
    `Investimento: ${formatCurrency(spend)}`,
    `Impressoes: ${formatInteger(impressions)}`,
    `Alcance: ${formatInteger(reach)}`,
    `Cliques: ${formatInteger(clicks)}`,
    `CTR: ${ctr.toFixed(2)}%`,
    `Conversoes: ${formatInteger(conversions)}`,
    `Campanhas no relatorio: ${payload.campaigns.length}`,
    bestCampaign ? `Melhor campanha: ${bestCampaign.name}` : null,
    reportUrl ? "" : null,
    reportUrl ? `Abrir relatorio: ${reportUrl}` : null,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n")
}
