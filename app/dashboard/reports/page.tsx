"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { ReportPreview } from "@/components/reports/report-preview"
import type {
  ReportCampaign,
  ReportClient,
  ReportPayload,
} from "@/components/reports/report-preview"
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

  const [activePeriod, setActivePeriod] = useState("7d")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [objective, setObjective] = useState("ALL")
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

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

    try {
      const params = new URLSearchParams({
        clientId: selectedClient.id,
        since: startDate,
        until: endDate,
        objective,
      })

      const res = await fetch(`/api/reports?${params}`)
      const data = (await res.json()) as ReportPayload | { error?: string }

      if (!res.ok) {
        setReportError(
          "error" in data && typeof data.error === "string"
            ? data.error
            : "Erro ao buscar relatorio"
        )
        setReportData(null)
        return
      }

      const parsedData = data as ReportPayload
      setReportData(parsedData)
      setSelectedCampaigns(parsedData.campaigns.map((campaign) => campaign.id))
    } catch {
      setReportError("Erro ao conectar com a META API")
      setReportData(null)
    } finally {
      setLoadingReport(false)
    }
  }, [endDate, objective, selectedClient, startDate])

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
      console.error(error)
      setReportError("Nao foi possivel gerar o PDF do relatorio")
    } finally {
      setIsExporting(false)
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
          <div className="max-w-2xl mx-auto">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente por nome ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] bg-white shadow-sm"
              />
            </div>

            {loadingClients ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-6 h-6 animate-spin text-[#C1121F]" />
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClients.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => setSelectedClient(client)}
                    className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:border-[#C1121F] hover:shadow-md transition text-left"
                  >
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(client.name)}`}
                    >
                      <span className="text-white text-sm font-bold">
                        {getInitials(client.name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        {client.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {client.company ?? "-"} · {client.email ?? "-"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          client.status === "ACTIVE"
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </span>
                      <span className="text-[#C1121F] text-sm font-medium">
                        Ver relatorio →
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
      <div className="sticky top-0 z-20 bg-[#F8FAFC] border-b border-gray-200">
        <Header
          title="Relatorio"
          subtitle={`${selectedClient.name} · ${startDate} ate ${endDate}`}
        />
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        <aside className="w-[300px] flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto p-5">
          <button
            onClick={() => {
              setSelectedClient(null)
              setReportData(null)
              setReportError("")
              setSelectedCampaigns([])
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para lista
          </button>

          <div className="flex items-center gap-3 mb-5 pb-5 border-b border-gray-100">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(selectedClient.name)}`}
            >
              <span className="text-white text-sm font-bold">
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
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Periodo
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-3">
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
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition ${
                    activePeriod === period.value
                      ? "bg-[#C1121F] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-1.5">Periodo personalizado:</p>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
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
                  className="flex items-center gap-2 cursor-pointer"
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
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Campanhas
              </label>
              <div className="space-y-2">
                {reportData.campaigns.map((campaign: ReportCampaign) => (
                  <label
                    key={campaign.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCampaigns.includes(campaign.id)}
                      onChange={() => toggleCampaign(campaign.id)}
                      className="accent-[#C1121F]"
                    />
                    <span className="text-xs text-gray-700 flex-1 truncate">
                      {campaign.name}
                    </span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0 ${
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
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setInsightsEnabled(!insightsEnabled)}
                className={`w-10 h-5 rounded-full transition cursor-pointer ${
                  insightsEnabled ? "bg-[#C1121F]" : "bg-gray-300"
                } relative`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all ${
                    insightsEnabled ? "left-5" : "left-0.5"
                  }`}
                />
              </div>
              <span className="text-sm text-gray-700">Insights automaticos</span>
            </label>
          </div>

          <button
            onClick={() => void fetchReport()}
            className="w-full bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold py-2.5 rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            {loadingReport ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Buscando...
              </>
            ) : (
              "Aplicar filtros"
            )}
          </button>
        </aside>

        <section className="flex-1 overflow-y-auto bg-[#eef1f6]">
          {loadingReport ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#C1121F] mx-auto mb-3" />
                <p className="text-sm text-gray-500">
                  Buscando dados da META API...
                </p>
              </div>
            </div>
          ) : reportError ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium text-red-500">
                  Erro ao carregar relatorio
                </p>
                <p className="text-sm mt-1">{reportError}</p>
                <button
                  onClick={() => void fetchReport()}
                  className="mt-4 text-[#C1121F] text-sm hover:underline"
                >
                  Tentar novamente
                </button>
              </div>
            </div>
          ) : !reportData ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              <p className="text-sm">
                Selecione os filtros e clique em &quot;Aplicar filtros&quot;
              </p>
            </div>
          ) : (
            <div className="px-8 py-8 pb-28">
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
            <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-gray-200 px-8 py-4 flex items-center justify-between z-10">
              <button
                onClick={() => {
                  setSelectedClient(null)
                  setReportData(null)
                  setReportError("")
                  setSelectedCampaigns([])
                }}
                className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Calendar className="w-4 h-4" />
                  Agendar envio
                </button>
                <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                  <Send className="w-4 h-4" />
                  Enviar por e-mail
                </button>
                <button
                  onClick={() => void handleGeneratePdf()}
                  disabled={isExporting}
                  className="flex items-center gap-2 bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
                >
                  <Download className="w-4 h-4" />
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
