"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { ReportPreview } from "@/components/reports/report-preview"
import { logError } from "@/lib/safe-logger"
import type {
  ReportCampaign,
  ReportClient,
  ReportGenerationResponse,
  ReportPayload,
} from "@/types/report.types"
import {
  Calendar,
  ChevronLeft,
  Download,
  Loader2,
  Search,
  Send,
} from "lucide-react"

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getColor(name: string) {
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

type ClientListItem = ReportClient & {
  status: string
}

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null)
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null)
  const [reportData, setReportData] = useState<ReportPayload | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportError, setReportError] = useState("")
  const [insightsEnabled, setInsightsEnabled] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState("")

  const [activePeriod, setActivePeriod] = useState("7d")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [objective, setObjective] = useState("ALL")
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  const clearCurrentReport = useCallback(() => {
    setReportData(null)
    setReportError("")
    setSelectedCampaigns([])
    setCurrentReportId(null)
    setActionFeedback("")
  }, [])

  useEffect(() => {
    const today = new Date()
    const formatDate = (date: Date) => date.toISOString().split("T")[0]

    if (activePeriod === "custom") {
      return
    }

    const daysByPeriod: Record<string, number> = {
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "180d": 180,
      "365d": 365,
    }

    if (activePeriod === "all") {
      setStartDate("2020-01-01")
      setEndDate(formatDate(today))
      return
    }

    const start = new Date(today)
    start.setDate(today.getDate() - daysByPeriod[activePeriod])
    setStartDate(formatDate(start))
    setEndDate(formatDate(today))
  }, [activePeriod])

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(Array.isArray(data) ? (data as ClientListItem[]) : [])
        setLoadingClients(false)
      })
      .catch(() => {
        setClients([])
        setLoadingClients(false)
      })
  }, [])

  const fetchReport = useCallback(async () => {
    if (!selectedClient || !startDate || !endDate) {
      return
    }

    setLoadingReport(true)
    setReportError("")
    setActionFeedback("")

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: selectedClient.id,
          since: startDate,
          until: endDate,
          objective,
        }),
      })
      const data = (await res.json()) as
        | ReportGenerationResponse
        | { error?: string }

      if (!res.ok) {
        setReportError(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Erro ao buscar relatorio"
        )
        clearCurrentReport()
        return
      }

      const response = data as ReportGenerationResponse
      const payload: ReportPayload = {
        client: response.client,
        campaigns: response.campaigns,
        accountInsights: response.accountInsights,
        dailyInsights: response.dailyInsights,
      }

      setCurrentReportId(response.reportId)
      setReportData(payload)
      setSelectedCampaigns(payload.campaigns.map((campaign) => campaign.id))
    } catch {
      setReportError("Erro ao conectar com a META API")
      clearCurrentReport()
    } finally {
      setLoadingReport(false)
    }
  }, [clearCurrentReport, endDate, objective, selectedClient, startDate])

  useEffect(() => {
    if (selectedClient && startDate && endDate) {
      void fetchReport()
    }
  }, [fetchReport, selectedClient, startDate, endDate])

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      (client.company ?? "").toLowerCase().includes(search.toLowerCase())
  )

  function toggleCampaign(id: string) {
    setSelectedCampaigns((current) =>
      current.includes(id)
        ? current.filter((campaignId) => campaignId !== id)
        : [...current, id]
    )
  }

  async function handleGeneratePdf() {
    if (!reportRef.current || !selectedClient) {
      return
    }

    setIsExporting(true)

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ])

      const element = reportRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      })

      const imageData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imageHeight = (canvas.height * pageWidth) / canvas.width

      let heightLeft = imageHeight
      let position = 0

      pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imageHeight
        pdf.addPage()
        pdf.addImage(imageData, "PNG", 0, position, pageWidth, imageHeight)
        heightLeft -= pageHeight
      }

      const fileName = [
        "greatgo-relatorio",
        sanitizeFileName(selectedClient.name),
        startDate,
        endDate,
      ]
        .filter(Boolean)
        .join("-")

      pdf.save(`${fileName}.pdf`)
    } catch (error) {
      logError("dashboard.reports.page", error)
      setReportError("Nao foi possivel gerar o PDF do relatorio")
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSendReport() {
    if (!currentReportId) {
      return
    }

    setIsSending(true)
    setReportError("")
    setActionFeedback("")

    try {
      const response = await fetch(`/api/reports/${currentReportId}/send`, {
        method: "POST",
      })
      const data = (await response.json()) as { error?: string }

      if (!response.ok) {
        throw new Error(
          typeof data.error === "string"
            ? data.error
            : "Nao foi possivel enviar o relatorio"
        )
      }

      setActionFeedback("Relatorio enviado ao grupo de WhatsApp configurado.")
    } catch (error) {
      setReportError(
        error instanceof Error
          ? error.message
          : "Nao foi possivel enviar o relatorio"
      )
    } finally {
      setIsSending(false)
    }
  }

  if (!selectedClient) {
    return (
      <>
        <Header
          title="Relatorios"
          subtitle="Selecione um cliente para visualizar o relatorio"
        />
        <div className="p-8">
          <div className="mx-auto max-w-2xl">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente por nome ou empresa..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-11 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>

            {loadingClients ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="py-20 text-center text-gray-400">
                <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client)
                      clearCurrentReport()
                    }}
                    className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition hover:border-[#C1121F] hover:shadow-md"
                  >
                    <div
                      className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full ${getColor(client.name)}`}
                    >
                      <span className="text-sm font-bold text-white">
                        {getInitials(client.name)}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {client.company ?? "-"} · {client.email ?? "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          client.status === "ACTIVE"
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-sm font-medium text-[#C1121F]">
                        Ver relatorio
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-[#F8FAFC]">
        <Header
          title="Relatorio"
          subtitle={`${selectedClient.name} · ${startDate} ate ${endDate}`}
        />
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        <aside className="w-[300px] flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-5">
          <button
            onClick={() => {
              setSelectedClient(null)
              clearCurrentReport()
            }}
            className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para a lista
          </button>

          <div className="mb-5 flex items-center gap-3 border-b border-gray-100 pb-5">
            <div
              className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${getColor(selectedClient.name)}`}
            >
              <span className="text-sm font-bold text-white">
                {getInitials(selectedClient.name)}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {selectedClient.name}
              </p>
              <p className="text-xs text-gray-400">
                {selectedClient.company ?? "-"}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Periodo
            </label>
            <div className="mb-3 grid grid-cols-2 gap-1.5">
              {[
                { label: "1 semana", value: "7d" },
                { label: "1 mes", value: "30d" },
                { label: "3 meses", value: "90d" },
                { label: "6 meses", value: "180d" },
                { label: "1 ano", value: "365d" },
                { label: "Completo", value: "all" },
              ].map((period) => (
                <button
                  key={period.value}
                  onClick={() => setActivePeriod(period.value)}
                  className={`rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                    activePeriod === period.value
                      ? "bg-[#C1121F] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <p className="mb-1.5 text-xs text-gray-400">Periodo personalizado:</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
              Objetivo
            </label>
            <div className="space-y-1.5">
              {[
                { label: "Todos", value: "ALL" },
                { label: "Trafego", value: "LINK_CLICKS" },
                { label: "Conversao", value: "CONVERSIONS" },
                { label: "Mensagens", value: "MESSAGES" },
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2"
                >
                  <input
                    type="radio"
                    name="objective"
                    checked={objective === option.value}
                    onChange={() => setObjective(option.value)}
                    className="accent-[#C1121F]"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {reportData?.campaigns.length ? (
            <div className="mb-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Campanhas
              </label>
              <div className="space-y-2">
                {reportData.campaigns.map((campaign: ReportCampaign) => (
                  <label
                    key={campaign.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={() => toggleCampaign(campaign.id)}
                      className="accent-[#C1121F]"
                    />
                    <span className="flex-1 truncate text-xs text-gray-700">
                      {campaign.name}
                    </span>
                    <span
                      className={`flex-shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                        campaign.status === "ACTIVE"
                          ? "bg-green-100 text-green-600"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {campaign.status === "ACTIVE" ? "Ativa" : "Pausada"}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-5">
            <label className="flex items-center gap-2">
              <div
                onClick={() => setInsightsEnabled(!insightsEnabled)}
                className={`relative h-5 w-10 cursor-pointer rounded-full transition ${
                  insightsEnabled ? "bg-[#C1121F]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                    insightsEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Insights automaticos</span>
            </label>
          </div>

          <button
            onClick={() => void fetchReport()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#C1121F] py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
          >
            {loadingReport ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Aplicar filtros"
            )}
          </button>
        </aside>

        <section className="flex-1 overflow-y-auto bg-[#eef1f6]">
          {loadingReport ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#C1121F]" />
                <p className="text-sm text-gray-500">
                  Buscando dados da META API...
                </p>
              </div>
            </div>
          ) : reportError ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium text-red-500">
                  Erro ao carregar relatorio
                </p>
                <p className="mt-1 text-sm">{reportError}</p>
                <button
                  onClick={() => void fetchReport()}
                  className="mt-4 text-sm text-[#C1121F] hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : !reportData ? (
            <div className="flex h-full items-center justify-center text-gray-400">
              <p className="text-sm">
                Selecione os filtros e clique em &quot;Aplicar filtros&quot;
              </p>
            </div>
          ) : (
            <div className="px-8 py-8 pb-28">
              {actionFeedback ? (
                <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-700">
                  {actionFeedback}
                </div>
              ) : null}

              <div ref={reportRef}>
                <ReportPreview
                  client={selectedClient}
                  reportData={reportData}
                  startDate={startDate}
                  endDate={endDate}
                  selectedCampaignIds={selectedCampaigns}
                  insightsEnabled={insightsEnabled}
                />
              </div>
            </div>
          )}

          {reportData ? (
            <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-gray-200 bg-white/95 px-8 py-4 backdrop-blur">
              <button
                onClick={() => {
                  setSelectedClient(null)
                  clearCurrentReport()
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                {currentReportId ? (
                  <Link
                    href={`/dashboard/reports/${currentReportId}`}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                  >
                    Ver relatorio salvo
                  </Link>
                ) : null}
                <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50">
                  <Calendar className="h-4 w-4" />
                  Agendar envio
                </button>
                <button
                  onClick={() => void handleSendReport()}
                  disabled={!currentReportId || isSending}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
                >
                  <Send className="h-4 w-4" />
                  {isSending ? "Enviando..." : "Enviar por WhatsApp"}
                </button>
                <button
                  onClick={() => void handleGeneratePdf()}
                  disabled={isExporting}
                  className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  {isExporting ? "Gerando PDF..." : "Salvar relatorio em PDF"}
                </button>
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </>
  )
}
