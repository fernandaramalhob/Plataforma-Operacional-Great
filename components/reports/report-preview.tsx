"use client"

import type { LucideIcon } from "lucide-react"
import {
  ArrowUpRight,
  BarChart2,
  DollarSign,
  Eye,
  MousePointer,
  Target,
  TrendingUp,
  Users,
} from "lucide-react"
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"
import {
  findBestCampaignByObjective,
  formatCurrency,
  formatInteger,
  formatPercentage,
  parseReportNumber,
  resolveObjectiveMetric,
} from "@/lib/report-metrics"
import { cn } from "@/lib/utils"
import type {
  ReportAction,
  ReportClient,
  ReportObjectiveValue,
  ReportPayload,
} from "@/types/report.types"

const PDF_CAMPAIGNS_PER_PAGE = 9

type ReportPreviewProps = {
  client: ReportClient
  reportData: ReportPayload
  startDate: string
  endDate: string
  objective: ReportObjectiveValue | string
  selectedCampaignIds: string[]
  insightsEnabled: boolean
  variant?: "screen" | "pdf"
}

type MetricCard = {
  label: string
  value: string
  icon: LucideIcon
  accent: string
}

type InsightCard = {
  title: string
  value: string
  accent: string
}

type CampaignRow = {
  id: string
  name: string
  objective: string
  status: string
  statusAccent: string
  metricValue: string
  clicks: string
  impressions: string
  spend: string
}

function getActionValue(actions: ReportAction[] | undefined, type: string) {
  return actions?.find((action) => action.action_type === type)?.value ?? "0"
}

function formatPeriod(date: string) {
  if (!date) {
    return "-"
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }

  return chunks
}

function ReportHeader({
  client,
  reportData,
  startDate,
  endDate,
  selectedCampaignCount,
  objectiveLabel,
  isPdf,
}: {
  client: ReportClient
  reportData: ReportPayload
  startDate: string
  endDate: string
  selectedCampaignCount: number
  objectiveLabel: string
  isPdf: boolean
}) {
  return (
    <div
      className={cn(
        "bg-[linear-gradient(135deg,#c1121f_0%,#da3a45_48%,#1f2937_100%)] text-white",
        isPdf ? "px-10 py-8" : "px-5 py-6 sm:px-8 sm:py-7 md:px-10 md:py-8"
      )}
    >
      <div
        className={cn(
          "gap-6",
          isPdf
            ? "flex items-start justify-between"
            : "flex flex-col items-start justify-between md:flex-row"
        )}
      >
        <div>
          <p className="text-[30px] font-black tracking-tight">GreatGo</p>
          <p className="mt-1 text-sm text-white/80">
            Relatorio de performance META Ads
          </p>
        </div>
        <div
          className={cn(
            "w-full md:w-auto",
            isPdf ? "text-right" : "text-left md:text-right"
          )}
        >
          <p className="text-lg font-bold">{client.name}</p>
          <p className="text-sm text-white/80">
            {client.company ?? "Marca nao informada"}
          </p>
          <p className="mt-2 text-xs text-white/70">
            Periodo: {formatPeriod(startDate)} ate {formatPeriod(endDate)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-6 gap-4",
          isPdf
            ? "grid grid-cols-3"
            : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3"
        )}
      >
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 print:break-inside-avoid">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Campanhas no relatorio
          </p>
          <p className="mt-2 text-sm font-semibold">
            {selectedCampaignCount} campanha(s)
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 print:break-inside-avoid">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Conta META
          </p>
          <p className="mt-2 text-sm font-semibold">
            {client.adAccountId ?? reportData.client?.adAccountId ?? "Nao informada"}
          </p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4 print:break-inside-avoid">
          <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
            Objetivo
          </p>
          <p className="mt-2 text-sm font-semibold">{objectiveLabel}</p>
        </div>
      </div>
    </div>
  )
}

function MetricsGrid({
  cards,
  isPdf,
}: {
  cards: MetricCard[]
  isPdf: boolean
}) {
  return (
    <section
      className={cn(
        "gap-4",
        isPdf
          ? "grid grid-cols-5"
          : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5"
      )}
    >
      {cards.map((item) => (
        <div
          key={item.label}
          className="rounded-3xl border border-gray-100 bg-white px-5 py-5 shadow-sm print:break-inside-avoid"
        >
          <div
            className={`mb-4 flex h-10 w-10 items-center justify-center rounded-2xl ${item.accent}`}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <p className="text-xs uppercase tracking-[0.18em] text-gray-400">
            {item.label}
          </p>
          <p className="mt-2 text-[26px] font-medium tracking-tight text-gray-900">
            {item.value}
          </p>
        </div>
      ))}
    </section>
  )
}

function AdvancedMetricsSection({
  cards,
  isPdf,
}: {
  cards: MetricCard[]
  isPdf: boolean
}) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 print:break-inside-avoid">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">
          Visao geral e metricas avancadas
        </h2>
        <p className="text-sm text-gray-500">
          Consolidado da conta no periodo selecionado.
        </p>
      </div>

      <div
        className={cn(
          "gap-4",
          isPdf
            ? "grid grid-cols-5"
            : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5"
        )}
      >
        {cards.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl bg-gray-50 px-4 py-4 text-center"
          >
            <item.icon className="mx-auto mb-2 h-4 w-4 text-[#C1121F]" />
            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
              {item.label}
            </p>
            <p className="mt-2 text-xl font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ChartSection({
  chartData,
  objectiveLabel,
  isPdf,
}: {
  chartData: Array<{ day: string; invest: number; clicks: number; results: number }>
  objectiveLabel: string
  isPdf: boolean
}) {
  if (chartData.length === 0) {
    return null
  }

  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 print:break-inside-avoid">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Evolucao por periodo</h2>
        <p className="text-sm text-gray-500">
          Comportamento diario de investimento, cliques e{" "}
          {objectiveLabel.toLowerCase()}.
        </p>
      </div>

      <div
        className={cn(
          "gap-4",
          isPdf
            ? "grid grid-cols-3"
            : "grid grid-cols-1 xl:grid-cols-3 print:grid-cols-3"
        )}
      >
        {[
          { label: "Investimento", key: "invest", color: "#C1121F" },
          { label: "Cliques", key: "clicks", color: "#8B5CF6" },
          { label: objectiveLabel, key: "results", color: "#14B87A" },
        ].map((chart) => (
          <div
            key={chart.key}
            className="rounded-2xl bg-gray-50 p-4 print:break-inside-avoid"
          >
            <p className="mb-3 text-sm font-semibold text-gray-700">
              {chart.label}
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94A3B8" }}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 12,
                    borderColor: "#E5E7EB",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={chart.key}
                  stroke={chart.color}
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </section>
  )
}

function InsightsSection({
  insights,
  isPdf,
}: {
  insights: InsightCard[]
  isPdf: boolean
}) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6 print:break-inside-avoid">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">Insights automaticos</h2>
        <p className="text-sm text-gray-500">
          Destaques gerados com base nos dados carregados para este relatorio.
        </p>
      </div>

      <div
        className={cn(
          "gap-4",
          isPdf
            ? "grid grid-cols-5"
            : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 print:grid-cols-5"
        )}
      >
        {insights.map((insight) => (
          <div
            key={insight.title}
            className={`rounded-2xl border px-4 py-4 ${insight.accent}`}
          >
            <p className="text-xs uppercase tracking-[0.16em]">{insight.title}</p>
            <p className="mt-3 text-sm font-semibold leading-6">{insight.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function SummarySection({
  summary,
  isPdf,
}: {
  summary: Array<{ label: string; value: string }>
  isPdf: boolean
}) {
  return (
    <section className="rounded-3xl border border-gray-100 bg-white px-5 py-4 shadow-sm sm:px-6 print:break-inside-avoid">
      <div
        className={cn(
          "gap-3",
          isPdf
            ? "grid grid-cols-4"
            : "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 print:grid-cols-4"
        )}
      >
        {summary.map((item) => (
          <div key={item.label}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
              {item.label}
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ScreenCampaignSection({
  rows,
  objectiveLabel,
}: {
  rows: CampaignRow[]
  objectiveLabel: string
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
      <div className="border-b border-gray-100 px-6 py-5">
        <h2 className="text-lg font-bold text-gray-900">Performance por campanha</h2>
        <p className="text-sm text-gray-500">
          Campanhas consideradas no relatorio e seus principais numeros.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="px-6 py-12 text-center text-sm text-gray-400">
          Nenhuma campanha selecionada para exibir nesta versao do relatorio.
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100 lg:hidden print:hidden">
            {rows.map((row) => (
              <article key={row.id} className="space-y-4 px-5 py-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                    <p className="mt-1 text-xs text-gray-400">{row.objective}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.statusAccent}`}
                  >
                    {row.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: objectiveLabel, value: row.metricValue },
                    { label: "Cliques", value: row.clicks },
                    { label: "Impressoes", value: row.impressions },
                    { label: "Gasto", value: row.spend },
                  ].map((item) => (
                    <div
                      key={`${row.id}-${item.label}`}
                      className="rounded-2xl bg-gray-50 px-4 py-3"
                    >
                      <p className="text-[11px] uppercase tracking-[0.16em] text-gray-400">
                        {item.label}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-gray-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>

          <table className="hidden w-full lg:table print:table">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {[
                  "Campanha",
                  "Status",
                  objectiveLabel,
                  "Cliques",
                  "Impressoes",
                  "Gasto",
                ].map((header) => (
                  <th
                    key={header}
                    className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {row.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">{row.objective}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.statusAccent}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {row.metricValue}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{row.clicks}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {row.impressions}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {row.spend}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  )
}

function PdfPageShell({
  pageNumber,
  totalPages,
  children,
}: {
  pageNumber: number
  totalPages: number
  children: React.ReactNode
}) {
  return (
    <section
      data-report-pdf-page
      className="flex h-[1622px] w-[1120px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] print:h-auto print:w-full print:break-after-page print:rounded-none print:shadow-none"
    >
      <div className="flex-1">{children}</div>
      <div className="border-t border-slate-200/80 bg-white px-10 py-3 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
        Pagina {pageNumber} de {totalPages}
      </div>
    </section>
  )
}

function PdfCampaignPage({
  rows,
  objectiveLabel,
  clientName,
}: {
  rows: CampaignRow[]
  objectiveLabel: string
  clientName: string
}) {
  return (
    <div className="flex h-full flex-col bg-[#f6f7fb] px-10 py-8">
      <section className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Performance por campanha
              </h2>
              <p className="text-sm text-gray-500">
                Campanhas selecionadas para {clientName}.
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Tabela paginada
            </span>
          </div>
        </div>

        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/80">
              {[
                "Campanha",
                "Status",
                objectiveLabel,
                "Cliques",
                "Impressoes",
                "Gasto",
              ].map((header) => (
                <th
                  key={header}
                  className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-50">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{row.name}</p>
                    <p className="mt-1 text-xs text-gray-400">{row.objective}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${row.statusAccent}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {row.metricValue}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.clicks}</td>
                <td className="px-6 py-4 text-sm text-gray-600">{row.impressions}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {row.spend}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  )
}

export function ReportPreview({
  client,
  reportData,
  startDate,
  endDate,
  objective,
  selectedCampaignIds,
  insightsEnabled,
  variant = "screen",
}: ReportPreviewProps) {
  const isPdf = variant === "pdf"
  const accountInsights = reportData.accountInsights ?? {}
  const spend = parseReportNumber(accountInsights.spend)
  const impressions = parseReportNumber(accountInsights.impressions)
  const reach = parseReportNumber(accountInsights.reach)
  const clicks = parseReportNumber(accountInsights.clicks)
  const ctr = parseReportNumber(accountInsights.ctr)
  const cpc = parseReportNumber(accountInsights.cpc)
  const cpm = parseReportNumber(accountInsights.cpm)
  const objectiveMetric = resolveObjectiveMetric(accountInsights, objective)

  const selectedCampaigns = reportData.campaigns.filter((campaign) =>
    selectedCampaignIds.includes(campaign.id)
  )

  const chartData = (reportData.dailyInsights ?? []).map((day) => ({
    day: day.date_start?.slice(5) ?? "-",
    invest: parseReportNumber(day.spend),
    clicks: parseReportNumber(day.clicks),
    results: resolveObjectiveMetric(day, objective).value,
  }))

  const bestCampaign = findBestCampaignByObjective(selectedCampaigns, objective)
  const bestCampaignMetric = resolveObjectiveMetric(
    bestCampaign?.insights?.data?.[0],
    objective
  )
  const activeCampaignCount = selectedCampaigns.filter(
    (campaign) => campaign.status === "ACTIVE"
  ).length
  const purchaseValue = parseReportNumber(
    getActionValue(
      accountInsights.action_values,
      "offsite_conversion.fb_pixel_purchase"
    )
  )

  const performanceCards: MetricCard[] = [
    {
      label: "Investimento",
      value: formatCurrency(spend),
      icon: DollarSign,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "Impressoes",
      value: formatInteger(impressions),
      icon: Eye,
      accent: "bg-purple-50 text-purple-600",
    },
    {
      label: "Alcance",
      value: formatInteger(reach),
      icon: Users,
      accent: "bg-teal-50 text-teal-600",
    },
    {
      label: "Cliques",
      value: formatInteger(clicks),
      icon: MousePointer,
      accent: "bg-orange-50 text-orange-600",
    },
    {
      label: "CTR",
      value: formatPercentage(ctr),
      icon: TrendingUp,
      accent: "bg-green-50 text-green-600",
    },
  ]

  const advancedMetrics: MetricCard[] = [
    {
      label: "CPC",
      value: formatCurrency(cpc),
      icon: ArrowUpRight,
      accent: "",
    },
    {
      label: "CPM",
      value: formatCurrency(cpm),
      icon: BarChart2,
      accent: "",
    },
    {
      label: objectiveMetric.label,
      value: formatInteger(objectiveMetric.value),
      icon: Target,
      accent: "",
    },
    {
      label: objectiveMetric.costLabel,
      value:
        objectiveMetric.costPerResult !== null
          ? formatCurrency(objectiveMetric.costPerResult)
          : "-",
      icon: DollarSign,
      accent: "",
    },
    {
      label:
        objectiveMetric.efficiencyLabel ??
        (objectiveMetric.valueAmount > 0 ? "Valor gerado" : "Eficiencia"),
      value:
        objectiveMetric.efficiencyLabel === "ROAS"
          ? objectiveMetric.efficiencyValue !== null
            ? `${objectiveMetric.efficiencyValue.toFixed(2)}x`
            : purchaseValue > 0 && spend > 0
              ? `${(purchaseValue / spend).toFixed(2)}x`
              : "-"
          : objectiveMetric.efficiencyValue !== null
            ? formatPercentage(objectiveMetric.efficiencyValue)
            : objectiveMetric.valueAmount > 0
              ? formatCurrency(objectiveMetric.valueAmount)
              : "-",
      icon: TrendingUp,
      accent: "",
    },
  ]

  const automaticInsights: InsightCard[] = [
    {
      title: "Melhor campanha",
      value:
        bestCampaign && bestCampaignMetric.value > 0
          ? `${bestCampaign.name} (${formatInteger(bestCampaignMetric.value)} ${bestCampaignMetric.label.toLowerCase()})`
          : bestCampaign?.name ?? "Sem dados suficientes",
      accent: "bg-yellow-50 text-yellow-700 border-yellow-100",
    },
    {
      title: "Conta analisada",
      value:
        client.adAccountId ?? reportData.client?.adAccountId ?? "Nao informada",
      accent: "bg-blue-50 text-blue-700 border-blue-100",
    },
    {
      title: "Investimento total",
      value: formatCurrency(spend),
      accent: "bg-green-50 text-green-700 border-green-100",
    },
    {
      title: "Campanhas selecionadas",
      value: `${selectedCampaigns.length} campanha(s)`,
      accent: "bg-red-50 text-red-700 border-red-100",
    },
    {
      title: "Campanhas ativas",
      value: `${activeCampaignCount} ativa(s)`,
      accent: "bg-indigo-50 text-indigo-700 border-indigo-100",
    },
  ]

  const campaignSummary = [
    {
      label: "Periodo",
      value: `${formatPeriod(startDate)} ate ${formatPeriod(endDate)}`,
    },
    {
      label: "Objetivo monitorado",
      value: objectiveMetric.label,
    },
    {
      label: "Campanhas ativas",
      value: `${activeCampaignCount} de ${selectedCampaigns.length}`,
    },
    {
      label: "Conta analisada",
      value:
        client.adAccountId ?? reportData.client?.adAccountId ?? "Nao informada",
    },
  ]

  const campaignRows: CampaignRow[] = selectedCampaigns.map((campaign) => {
    const insight = campaign.insights?.data?.[0] ?? {}
    const campaignMetric = resolveObjectiveMetric(insight, objective)

    return {
      id: campaign.id,
      name: campaign.name,
      objective: campaign.objective ?? "Sem objetivo informado",
      status: campaign.status === "ACTIVE" ? "Ativa" : campaign.status,
      statusAccent:
        campaign.status === "ACTIVE"
          ? "bg-green-50 text-green-600"
          : "bg-gray-100 text-gray-500",
      metricValue: formatInteger(campaignMetric.value),
      clicks: formatInteger(parseReportNumber(insight.clicks)),
      impressions: formatInteger(parseReportNumber(insight.impressions)),
      spend: formatCurrency(parseReportNumber(insight.spend)),
    }
  })

  if (!isPdf) {
    return (
      <div className="mx-auto w-full max-w-[1120px] overflow-hidden rounded-[28px] bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] print:w-[190mm] print:max-w-none print:rounded-none print:shadow-none">
        <ReportHeader
          client={client}
          reportData={reportData}
          startDate={startDate}
          endDate={endDate}
          selectedCampaignCount={selectedCampaigns.length}
          objectiveLabel={objectiveMetric.label}
          isPdf={false}
        />

        <div className="space-y-5 bg-[#f6f7fb] px-4 py-5 sm:px-6 sm:py-6 md:px-10 md:py-8">
          <MetricsGrid cards={performanceCards} isPdf={false} />
          <AdvancedMetricsSection cards={advancedMetrics} isPdf={false} />
          <ChartSection
            chartData={chartData}
            objectiveLabel={objectiveMetric.label}
            isPdf={false}
          />
          <ScreenCampaignSection
            rows={campaignRows}
            objectiveLabel={objectiveMetric.label}
          />
          {insightsEnabled ? (
            <InsightsSection insights={automaticInsights} isPdf={false} />
          ) : null}
          <SummarySection summary={campaignSummary} isPdf={false} />
        </div>
      </div>
    )
  }

  const campaignChunks = chunkItems(campaignRows, PDF_CAMPAIGNS_PER_PAGE)
  const hasSecondaryPage =
    chartData.length > 0 || insightsEnabled || campaignSummary.length > 0 || campaignRows.length === 0
  const totalPages =
    1 + (hasSecondaryPage ? 1 : 0) + Math.max(campaignChunks.length, 0)

  let pageNumber = 1

  return (
    <div className="mx-auto flex w-[1120px] flex-col gap-6 bg-transparent">
      <PdfPageShell pageNumber={pageNumber++} totalPages={totalPages}>
        <div className="flex h-full flex-col bg-[#f6f7fb]">
          <ReportHeader
            client={client}
            reportData={reportData}
            startDate={startDate}
            endDate={endDate}
            selectedCampaignCount={selectedCampaigns.length}
            objectiveLabel={objectiveMetric.label}
            isPdf
          />

          <div className="flex-1 space-y-5 px-10 py-8">
            <MetricsGrid cards={performanceCards} isPdf />
            <AdvancedMetricsSection cards={advancedMetrics} isPdf />
          </div>
        </div>
      </PdfPageShell>

      {hasSecondaryPage ? (
        <PdfPageShell pageNumber={pageNumber++} totalPages={totalPages}>
          <div className="flex h-full flex-col bg-[#f6f7fb] px-10 py-8">
            <div className="space-y-5">
              <ChartSection
                chartData={chartData}
                objectiveLabel={objectiveMetric.label}
                isPdf
              />
              {insightsEnabled ? (
                <InsightsSection insights={automaticInsights} isPdf />
              ) : null}
              <SummarySection summary={campaignSummary} isPdf />
              {campaignRows.length === 0 ? (
                <section className="rounded-3xl border border-gray-100 bg-white px-6 py-12 text-center text-sm text-gray-400 shadow-sm">
                  Nenhuma campanha selecionada para exibir nesta versao do relatorio.
                </section>
              ) : null}
            </div>
          </div>
        </PdfPageShell>
      ) : null}

      {campaignChunks.map((chunk) => (
        <PdfPageShell
          key={`campaign-page-${chunk[0]?.id ?? "empty"}`}
          pageNumber={pageNumber++}
          totalPages={totalPages}
        >
          <PdfCampaignPage
            rows={chunk}
            objectiveLabel={objectiveMetric.label}
            clientName={client.name}
          />
        </PdfPageShell>
      ))}
    </div>
  )
}
