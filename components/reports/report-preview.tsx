"use client"

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
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts"

export type ReportAction = {
  action_type?: string
  value?: string
}

export type ReportInsight = {
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: ReportAction[]
  action_values?: ReportAction[]
  date_start?: string
}

export type ReportCampaign = {
  id: string
  name: string
  status: string
  objective?: string
  insights?: {
    data?: ReportInsight[]
  }
}

export type ReportClient = {
  id: string
  name: string
  company: string | null
  email?: string | null
  adAccountId?: string | null
}

export type ReportPayload = {
  client?: {
    id: string
    name: string
    company?: string | null
    adAccountId?: string | null
  }
  campaigns: ReportCampaign[]
  accountInsights?: ReportInsight
  dailyInsights?: ReportInsight[]
}

type ReportPreviewProps = {
  client: ReportClient
  reportData: ReportPayload
  startDate: string
  endDate: string
  selectedCampaignIds: string[]
  insightsEnabled: boolean
}

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

function formatPeriod(date: string) {
  if (!date) {
    return "-"
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
}

export function ReportPreview({
  client,
  reportData,
  startDate,
  endDate,
  selectedCampaignIds,
  insightsEnabled,
}: ReportPreviewProps) {
  const accountInsights = reportData.accountInsights ?? {}
  const spend = parseNumber(accountInsights.spend)
  const impressions = parseNumber(accountInsights.impressions)
  const reach = parseNumber(accountInsights.reach)
  const clicks = parseNumber(accountInsights.clicks)
  const ctr = parseNumber(accountInsights.ctr)
  const cpc = parseNumber(accountInsights.cpc)
  const cpm = parseNumber(accountInsights.cpm)
  const conversions = parseNumber(
    getActionValue(accountInsights.actions, "offsite_conversion.fb_pixel_purchase")
  )
  const purchaseValue = parseNumber(
    getActionValue(
      accountInsights.action_values,
      "offsite_conversion.fb_pixel_purchase"
    )
  )
  const cpa = conversions > 0 ? spend / conversions : 0
  const roas = spend > 0 ? purchaseValue / spend : 0

  const selectedCampaigns = reportData.campaigns.filter((campaign) =>
    selectedCampaignIds.includes(campaign.id)
  )

  const chartData = (reportData.dailyInsights ?? []).map((day) => ({
    day: day.date_start?.slice(5) ?? "-",
    invest: parseNumber(day.spend),
    clicks: parseNumber(day.clicks),
    conversions: parseNumber(
      getActionValue(day.actions, "offsite_conversion.fb_pixel_purchase")
    ),
  }))

  const bestCampaign =
    selectedCampaigns.length > 0
      ? selectedCampaigns.reduce((best, current) => {
          const bestClicks = parseNumber(best.insights?.data?.[0]?.clicks)
          const currentClicks = parseNumber(current.insights?.data?.[0]?.clicks)
          return currentClicks > bestClicks ? current : best
        }, selectedCampaigns[0])
      : null

  const automaticInsights = [
    {
      title: "Melhor campanha",
      value: bestCampaign?.name ?? "Sem dados suficientes",
      accent: "bg-yellow-50 text-yellow-700 border-yellow-100",
    },
    {
      title: "Conta analisada",
      value: client.adAccountId ?? reportData.client?.adAccountId ?? "Nao informada",
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
  ]

  return (
    <div className="w-[1120px] max-w-full mx-auto bg-white shadow-[0_24px_60px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="bg-[linear-gradient(135deg,#c1121f_0%,#da3a45_48%,#1f2937_100%)] px-10 py-8 text-white">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-[30px] font-black tracking-tight">GreatGo</p>
            <p className="text-sm text-white/80 mt-1">
              Relatorio de performance META Ads
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{client.name}</p>
            <p className="text-sm text-white/80">
              {client.company ?? "Marca nao informada"}
            </p>
            <p className="text-xs text-white/70 mt-2">
              Periodo: {formatPeriod(startDate)} ate {formatPeriod(endDate)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4">
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              Campanhas no relatorio
            </p>
            <p className="mt-2 text-sm font-semibold">
              {selectedCampaigns.length} campanha(s)
            </p>
          </div>
        </div>
      </div>

      <div className="px-10 py-8 space-y-6 bg-[#f6f7fb]">
        <section className="grid grid-cols-5 gap-4">
          {[
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
              value: `${ctr.toFixed(2)}%`,
              icon: TrendingUp,
              accent: "bg-green-50 text-green-600",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-3xl border border-gray-100 bg-white px-5 py-5 shadow-sm"
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

        <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Visao geral e metricas avancadas
              </h2>
              <p className="text-sm text-gray-500">
                Consolidado da conta no periodo selecionado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4">
            {[
              {
                label: "CPC",
                value: formatCurrency(cpc),
                icon: ArrowUpRight,
              },
              {
                label: "CPM",
                value: formatCurrency(cpm),
                icon: BarChart2,
              },
              {
                label: "Conversoes",
                value: formatInteger(conversions),
                icon: Target,
              },
              {
                label: "CPA",
                value: conversions > 0 ? formatCurrency(cpa) : "-",
                icon: DollarSign,
              },
              {
                label: "ROAS",
                value: roas > 0 ? `${roas.toFixed(2)}x` : "-",
                icon: TrendingUp,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl bg-gray-50 px-4 py-4 text-center"
              >
                <item.icon className="mx-auto h-4 w-4 text-[#C1121F] mb-2" />
                <p className="text-xs uppercase tracking-[0.16em] text-gray-400">
                  {item.label}
                </p>
                <p className="mt-2 text-xl font-bold text-gray-900">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </section>

        {chartData.length > 0 && (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Evolucao por periodo
              </h2>
              <p className="text-sm text-gray-500">
                Comportamento diario de investimento, cliques e conversoes.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Investimento", key: "invest", color: "#C1121F" },
                { label: "Cliques", key: "clicks", color: "#8B5CF6" },
                { label: "Conversoes", key: "conversions", color: "#14B87A" },
              ].map((chart) => (
                <div key={chart.key} className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">
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
        )}

        <section className="rounded-3xl border border-gray-100 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-5">
            <h2 className="text-lg font-bold text-gray-900">
              Performance por campanha
            </h2>
            <p className="text-sm text-gray-500">
              Campanhas consideradas no relatorio e seus principais numeros.
            </p>
          </div>

          {selectedCampaigns.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">
              Nenhuma campanha selecionada para exibir nesta versao do relatorio.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  {["Campanha", "Status", "Cliques", "Impressoes", "Gasto"].map(
                    (header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400"
                      >
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {selectedCampaigns.map((campaign) => {
                  const insight = campaign.insights?.data?.[0] ?? {}

                  return (
                    <tr key={campaign.id} className="border-b border-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {campaign.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {campaign.objective ?? "Sem objetivo informado"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                            campaign.status === "ACTIVE"
                              ? "bg-green-50 text-green-600"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {campaign.status === "ACTIVE" ? "Ativa" : campaign.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatInteger(parseNumber(insight.clicks))}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatInteger(parseNumber(insight.impressions))}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(parseNumber(insight.spend))}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </section>

        {insightsEnabled && (
          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-bold text-gray-900">
                Insights automaticos
              </h2>
              <p className="text-sm text-gray-500">
                Destaques gerados com base nos dados carregados para este
                relatorio.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {automaticInsights.map((insight) => (
                <div
                  key={insight.title}
                  className={`rounded-2xl border px-4 py-4 ${insight.accent}`}
                >
                  <p className="text-xs uppercase tracking-[0.16em]">
                    {insight.title}
                  </p>
                  <p className="mt-3 text-sm font-semibold leading-6">
                    {insight.value}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
