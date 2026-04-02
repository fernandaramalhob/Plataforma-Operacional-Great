import type {
  ReportAction,
  ReportCampaign,
  ReportInsight,
  ReportObjectiveValue,
} from "@/types/report.types"

type MetricCandidate = {
  label: string
  matchers: string[]
  singularLabel?: string
}

export type ObjectiveMetricSummary = {
  label: string
  value: number
  costLabel: string
  costPerResult: number | null
  valueLabel: string | null
  valueAmount: number
  efficiencyLabel: string | null
  efficiencyValue: number | null
}

const TRAFFIC_CANDIDATES: MetricCandidate[] = [
  { label: "Visualizações de página", matchers: ["landing_page_view"] },
  { label: "Cliques no link", matchers: ["link_click", "outbound_click"] },
]

const MESSAGE_CANDIDATES: MetricCandidate[] = [
  {
    label: "Conversas iniciadas",
    matchers: ["messaging_conversation_started", "total_messaging_connection"],
  },
  {
    label: "Primeiras respostas",
    matchers: ["messaging_first_reply"],
  },
]

const CONVERSION_CANDIDATES: MetricCandidate[] = [
  {
    label: "Compras",
    matchers: [
      "offsite_conversion.fb_pixel_purchase",
      "omni_purchase",
      "onsite_conversion.purchase",
      "purchase",
    ],
    singularLabel: "compra",
  },
  {
    label: "Leads",
    matchers: [
      "offsite_conversion.fb_pixel_lead",
      "leadgen.other",
      "lead",
    ],
    singularLabel: "lead",
  },
  {
    label: "Cadastros",
    matchers: [
      "offsite_conversion.fb_pixel_complete_registration",
      "complete_registration",
    ],
    singularLabel: "cadastro",
  },
  {
    label: "Contatos",
    matchers: ["contact", "submit_application"],
    singularLabel: "contato",
  },
]

function normalizeActionType(value?: string) {
  return value?.toLowerCase().trim() ?? ""
}

export function parseReportNumber(value?: string) {
  return Number.parseFloat(value ?? "0") || 0
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  })
}

export function formatInteger(value: number) {
  return value.toLocaleString("pt-BR")
}

export function formatPercentage(value: number) {
  return `${value.toFixed(2)}%`
}

function sumActionMetric(actions: ReportAction[] | undefined, matcher: string) {
  return (actions ?? []).reduce((total, action) => {
    const actionType = normalizeActionType(action.action_type)

    if (!actionType.includes(matcher)) {
      return total
    }

    return total + parseReportNumber(action.value)
  }, 0)
}

function resolveMetricCandidate(
  actions: ReportAction[] | undefined,
  candidates: MetricCandidate[]
) {
  for (const candidate of candidates) {
    for (const matcher of candidate.matchers) {
      const value = sumActionMetric(actions, matcher)

      if (value > 0) {
        return {
          label: candidate.label,
          value,
          matcher,
          singularLabel: candidate.singularLabel ?? candidate.label.toLowerCase(),
        }
      }
    }
  }

  return null
}

function buildTrafficMetric(insight: ReportInsight): ObjectiveMetricSummary {
  const clicks = parseReportNumber(insight.clicks)
  const impressions = parseReportNumber(insight.impressions)
  const resolved =
    resolveMetricCandidate(insight.actions, TRAFFIC_CANDIDATES) ??
    ({
      label: "Cliques",
      value: clicks,
      matcher: "clicks",
    } as const)

  const costPerResult = resolved.value > 0 ? parseReportNumber(insight.spend) / resolved.value : null

  if (resolved.matcher === "landing_page_view" && clicks > 0) {
    return {
      label: resolved.label,
      value: resolved.value,
      costLabel: "Custo por visita",
      costPerResult,
      valueLabel: null,
      valueAmount: 0,
      efficiencyLabel: "Taxa de visita",
      efficiencyValue: (resolved.value / clicks) * 100,
    }
  }

  return {
    label: resolved.label,
    value: resolved.value,
    costLabel:
      resolved.label === "Cliques"
        ? "CPC"
        : "Custo por clique",
    costPerResult,
    valueLabel: null,
    valueAmount: 0,
    efficiencyLabel: impressions > 0 ? "CTR de link" : null,
    efficiencyValue: impressions > 0 ? (resolved.value / impressions) * 100 : null,
  }
}

function buildMessageMetric(insight: ReportInsight): ObjectiveMetricSummary {
  const clicks = parseReportNumber(insight.clicks)
  const resolved =
    resolveMetricCandidate(insight.actions, MESSAGE_CANDIDATES) ?? {
      label: "Conversas",
      value: 0,
      matcher: "messages",
    }

  return {
    label: resolved.label,
    value: resolved.value,
    costLabel: "Custo por conversa",
    costPerResult:
      resolved.value > 0 ? parseReportNumber(insight.spend) / resolved.value : null,
    valueLabel: null,
    valueAmount: 0,
    efficiencyLabel: clicks > 0 ? "Taxa de conversa" : null,
    efficiencyValue: clicks > 0 ? (resolved.value / clicks) * 100 : null,
  }
}

export function resolveMessageMetric(insight: ReportInsight | undefined) {
  return buildMessageMetric(insight ?? {})
}

function buildConversionMetric(insight: ReportInsight): ObjectiveMetricSummary {
  const clicks = parseReportNumber(insight.clicks)
  const spend = parseReportNumber(insight.spend)
  const resolved =
    resolveMetricCandidate(insight.actions, CONVERSION_CANDIDATES) ?? {
      label: "Conversões",
      value: 0,
      matcher: "conversion",
      singularLabel: "resultado",
    }
  const valueAmount =
    resolved.value > 0 ? sumActionMetric(insight.action_values, resolved.matcher) : 0

  return {
    label: resolved.label,
    value: resolved.value,
    costLabel: `Custo por ${resolved.singularLabel}`,
    costPerResult: resolved.value > 0 ? spend / resolved.value : null,
    valueLabel: valueAmount > 0 ? "Valor gerado" : null,
    valueAmount,
    efficiencyLabel:
      valueAmount > 0 && spend > 0
        ? "ROAS"
        : clicks > 0
          ? "Taxa de conversão"
          : null,
    efficiencyValue:
      valueAmount > 0 && spend > 0
        ? valueAmount / spend
        : clicks > 0
          ? (resolved.value / clicks) * 100
          : null,
  }
}

export function resolveObjectiveMetric(
  insight: ReportInsight | undefined,
  objective: ReportObjectiveValue | string
): ObjectiveMetricSummary {
  const safeInsight = insight ?? {}

  if (objective === "LINK_CLICKS") {
    return buildTrafficMetric(safeInsight)
  }

  if (objective === "MESSAGES") {
    return buildMessageMetric(safeInsight)
  }

  if (objective === "CONVERSIONS") {
    return buildConversionMetric(safeInsight)
  }

  const conversionMetric = buildConversionMetric(safeInsight)
  if (conversionMetric.value > 0) {
    return conversionMetric
  }

  const messageMetric = buildMessageMetric(safeInsight)
  if (messageMetric.value > 0) {
    return messageMetric
  }

  return buildTrafficMetric(safeInsight)
}

export function findBestCampaignByObjective(
  campaigns: ReportCampaign[],
  objective: ReportObjectiveValue | string
) {
  if (!campaigns.length) {
    return null
  }

  return campaigns.reduce((best, current) => {
    const bestInsight = best.insights?.data?.[0]
    const currentInsight = current.insights?.data?.[0]
    const bestMetric = resolveObjectiveMetric(bestInsight, objective)
    const currentMetric = resolveObjectiveMetric(currentInsight, objective)

    if (currentMetric.value !== bestMetric.value) {
      return currentMetric.value > bestMetric.value ? current : best
    }

    return parseReportNumber(currentInsight?.clicks) >
      parseReportNumber(bestInsight?.clicks)
      ? current
      : best
  }, campaigns[0])
}
