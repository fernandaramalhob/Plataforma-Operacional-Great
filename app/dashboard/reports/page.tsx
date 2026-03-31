"use client"

import Link from "next/link"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  Calendar,
  ChevronLeft,
  Download,
  Loader2,
  Send,
} from "lucide-react"
import { CampaignSelector } from "@/components/clients/campaign-selector"
import { Header } from "@/components/layout/header"
import { ReportPreview } from "@/components/reports/report-preview"
import { ReportTemplateEditor } from "@/components/reports/report-template-editor"
import { SendReportComposer } from "@/components/reports/send-report-composer"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  FilterLabel,
  FilterSearchInput,
} from "@/components/ui/filter-controls"
import { fetchJsonOrThrow } from "@/lib/api-client"
import { buildReportPdfFilePayload, exportReportPdf } from "@/lib/report-pdf"
import { buildReportSendPreview } from "@/lib/report-message"
import {
  pollSavedReportUntilReady,
  requestQueuedReport,
  sendReportToWhatsApp,
} from "@/lib/report-client"
import {
  loadReportTemplate,
  saveReportTemplate,
} from "@/lib/report-template-storage"
import { logError } from "@/lib/safe-logger"
import type { ClientListItem } from "@/types/client.types"
import type {
  ReportMetricKey,
  ReportMetricVisibility,
  ReportObjectiveValue,
  ReportPayload,
  ReportSectionKey,
  ReportSectionVisibility,
  ReportSendMode,
  ReportTemplateDraft,
  SavedReportResponse,
} from "@/types/report.types"

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

const DEFAULT_TEMPLATE_NAME = "Template padrao"

const DEFAULT_REPORT_SECTIONS: ReportSectionVisibility = {
  overview: true,
  advancedMetrics: true,
  chart: true,
  campaignTable: true,
  topAds: true,
  gender: true,
  insights: true,
  summary: true,
  notes: true,
}

const DEFAULT_REPORT_METRICS: ReportMetricVisibility = {
  spend: true,
  impressions: true,
  reach: true,
  clicks: true,
  ctr: true,
  cpc: true,
  cpm: true,
  conversationsStarted: true,
  costPerConversation: true,
  conversationRate: true,
}

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

export default function ReportsPage() {
  const reportRef = useRef<HTMLDivElement>(null)
  const pdfReportRef = useRef<HTMLDivElement>(null)
  const reportPollSequenceRef = useRef(0)
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loadingClients, setLoadingClients] = useState(true)
  const [search, setSearch] = useState("")
  const [selectedClient, setSelectedClient] = useState<ClientListItem | null>(null)
  const [reportData, setReportData] = useState<ReportPayload | null>(null)
  const [loadingReport, setLoadingReport] = useState(false)
  const [loadingReportMessage, setLoadingReportMessage] = useState("")
  const [reportError, setReportError] = useState("")
  const [insightsEnabled, setInsightsEnabled] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [currentReportId, setCurrentReportId] = useState<string | null>(null)
  const [currentReportGeneratedAt, setCurrentReportGeneratedAt] = useState<
    string | null
  >(null)
  const [actionFeedback, setActionFeedback] = useState("")
  const [sendMode, setSendMode] = useState<ReportSendMode>("PDF_AND_MESSAGE")
  const [sendMessage, setSendMessage] = useState("")
  const [templateName, setTemplateName] = useState(DEFAULT_TEMPLATE_NAME)
  const [customTitle, setCustomTitle] = useState("FACEBOOK - Visao Geral")
  const [executiveSummary, setExecutiveSummary] = useState("")
  const [closingNotes, setClosingNotes] = useState("")
  const [sectionVisibility, setSectionVisibility] = useState<ReportSectionVisibility>(
    DEFAULT_REPORT_SECTIONS
  )
  const [metricVisibility, setMetricVisibility] = useState<ReportMetricVisibility>(
    DEFAULT_REPORT_METRICS
  )
  const [savedTemplateLabel, setSavedTemplateLabel] = useState<string | null>(null)

  const [activePeriod, setActivePeriod] = useState("7d")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [objective, setObjective] = useState<ReportObjectiveValue>("ALL")
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([])

  const sleep = useCallback(
    (milliseconds: number) =>
      new Promise<void>((resolve) => {
        window.setTimeout(resolve, milliseconds)
      }),
    []
  )

  const resetCustomization = useCallback(() => {
    setTemplateName(DEFAULT_TEMPLATE_NAME)
    setCustomTitle("FACEBOOK - Visao Geral")
    setExecutiveSummary("")
    setClosingNotes("")
    setSectionVisibility(DEFAULT_REPORT_SECTIONS)
    setMetricVisibility(DEFAULT_REPORT_METRICS)
    setSavedTemplateLabel(null)
  }, [])

  const applyTemplate = useCallback(
    (template: ReportTemplateDraft | null, fallbackMessage?: string) => {
      if (!template) {
        setSavedTemplateLabel(null)
        if (fallbackMessage !== undefined) {
          setSendMessage(fallbackMessage)
        }
        return
      }

      setTemplateName(template.name || DEFAULT_TEMPLATE_NAME)
      setCustomTitle(template.customTitle || "FACEBOOK - Visao Geral")
      setExecutiveSummary(template.executiveSummary || "")
      setClosingNotes(template.closingNotes || "")
      setSectionVisibility(template.sections || DEFAULT_REPORT_SECTIONS)
      setMetricVisibility(template.metrics || DEFAULT_REPORT_METRICS)
      setSendMode(template.sendMode || "PDF_AND_MESSAGE")
      setSendMessage(template.sendMessage || fallbackMessage || "")
      setSavedTemplateLabel(template.name || DEFAULT_TEMPLATE_NAME)
    },
    []
  )

  const applySavedReport = useCallback((savedReport: SavedReportResponse) => {
    if (!savedReport.payload) {
      return false
    }

    const payload: ReportPayload = {
      client: savedReport.payload.client,
      campaigns: savedReport.payload.campaigns,
      accountInsights: savedReport.payload.accountInsights,
      dailyInsights: savedReport.payload.dailyInsights,
      topAds: savedReport.payload.topAds,
      genderBreakdown: savedReport.payload.genderBreakdown,
    }

    setCurrentReportId(savedReport.id)
    setCurrentReportGeneratedAt(savedReport.generatedAt)
    setReportData(payload)
    setSelectedCampaigns(payload.campaigns.map((campaign) => campaign.id))
    const previewMessage = buildReportSendPreview({
      reportId: savedReport.id,
      payload: savedReport.payload,
    })
    const savedTemplate = selectedClient
      ? loadReportTemplate(selectedClient.id)
      : null

    applyTemplate(savedTemplate, previewMessage)

    return true
  }, [applyTemplate, selectedClient])

  const clearCurrentReport = useCallback(() => {
    reportPollSequenceRef.current += 1
    setReportData(null)
    setReportError("")
    setSelectedCampaigns([])
    setCurrentReportId(null)
    setCurrentReportGeneratedAt(null)
    setActionFeedback("")
    setLoadingReportMessage("")
    setSendMode("PDF_AND_MESSAGE")
    setSendMessage("")
  }, [])

  useEffect(() => {
    if (!selectedClient) {
      resetCustomization()
      return
    }

    applyTemplate(loadReportTemplate(selectedClient.id))
  }, [applyTemplate, resetCustomization, selectedClient])

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
    void fetchJsonOrThrow<ClientListItem[]>(
      "/api/clients",
      undefined,
      "Erro ao carregar clientes"
    )
      .then((data) => {
        setClients(data)
        setLoadingClients(false)
      })
      .catch(() => {
        setClients([])
        setLoadingClients(false)
      })
  }, [])

  const waitForQueuedReport = useCallback(
    async (reportId: string, sequence: number) => {
      const savedReport = await pollSavedReportUntilReady({
        reportId,
        sequence,
        getCurrentSequence: () => reportPollSequenceRef.current,
        sleep,
        fallbackMessage: "Erro ao acompanhar a fila do relatorio",
        onUpdate: (nextReport) => {
          setCurrentReportId(nextReport.id)
          setCurrentReportGeneratedAt(nextReport.generatedAt)

          if (applySavedReport(nextReport)) {
            setLoadingReportMessage("")
            return
          }

          setLoadingReportMessage(
            "Relatorio em fila. Processando dados da META API..."
          )
        },
      })

      if (savedReport?.status === "FAILED") {
        throw new Error(
          savedReport.errorMessage || "Nao foi possivel gerar o relatorio"
        )
      }
    },
    [applySavedReport, sleep]
  )

  const fetchReport = useCallback(async () => {
    if (!selectedClient || !startDate || !endDate) {
      return
    }

    clearCurrentReport()
    setLoadingReport(true)
    setReportError("")
    setActionFeedback("")
    setLoadingReportMessage("Enfileirando relatorio...")
    const sequence = reportPollSequenceRef.current

    try {
      const response = await requestQueuedReport({
        clientId: selectedClient.id,
        since: startDate,
        until: endDate,
        objective,
      })
      setCurrentReportId(response.reportId)
      setCurrentReportGeneratedAt(response.generatedAt)
      setLoadingReportMessage("Relatorio em fila. Processando dados da META API...")
      await waitForQueuedReport(response.reportId, sequence)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao conectar com a META API"
      clearCurrentReport()
      setReportError(message)
    } finally {
      setLoadingReport(false)
    }
  }, [
    clearCurrentReport,
    endDate,
    objective,
    selectedClient,
    startDate,
    waitForQueuedReport,
  ])

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

  function toggleSection(section: ReportSectionKey) {
    setSectionVisibility((current) => ({
      ...current,
      [section]: !current[section],
    }))
  }

  function toggleMetric(metric: ReportMetricKey) {
    setMetricVisibility((current) => ({
      ...current,
      [metric]: !current[metric],
    }))
  }

  function handleSaveTemplate() {
    if (!selectedClient) {
      return
    }

    const template: ReportTemplateDraft = {
      name: templateName.trim() || DEFAULT_TEMPLATE_NAME,
      customTitle,
      executiveSummary,
      closingNotes,
      sections: sectionVisibility,
      metrics: metricVisibility,
      sendMode,
      sendMessage,
    }

    saveReportTemplate(selectedClient.id, template)
    setSavedTemplateLabel(template.name)
    setActionFeedback(`Template "${template.name}" salvo para este cliente.`)
  }

  function handleLoadTemplate() {
    if (!selectedClient) {
      return
    }

    const template = loadReportTemplate(selectedClient.id)
    if (!template) {
      setActionFeedback("Ainda nao existe template salvo para este cliente.")
      return
    }

    applyTemplate(template, sendMessage)
    setActionFeedback(`Template "${template.name}" carregado.`)
  }

  async function handleGeneratePdf() {
    const sourceElement = pdfReportRef.current ?? reportRef.current

    if (!sourceElement || !selectedClient) {
      return
    }

    setIsExporting(true)

    try {
      await exportReportPdf({
        sourceElement,
        clientName: selectedClient.name,
        startDate,
        endDate,
        objective,
        generatedAt: currentReportGeneratedAt ?? new Date(),
        reportId: currentReportId ?? undefined,
      })
    } catch (error) {
      logError("dashboard.reports.page", error)
      setReportError("Nao foi possivel gerar o PDF do relatorio")
    } finally {
      setIsExporting(false)
    }
  }

  async function handleSendReport() {
    const sourceElement = pdfReportRef.current ?? reportRef.current

    if (!currentReportId || !selectedClient || !sourceElement) {
      return
    }

    setIsSending(true)
    setReportError("")
    setActionFeedback("")

    try {
      const pdfAttachment =
        sendMode === "PDF_ONLY" || sendMode === "PDF_AND_MESSAGE"
          ? await buildReportPdfFilePayload({
              sourceElement,
              clientName: selectedClient.name,
              startDate,
              endDate,
              objective,
              generatedAt: currentReportGeneratedAt ?? new Date(),
              reportId: currentReportId,
            })
          : null

      await sendReportToWhatsApp(currentReportId, {
        mode: sendMode,
        message:
          sendMode === "PDF_ONLY" ? undefined : sendMessage,
        pdfBase64: pdfAttachment?.base64,
        pdfFileName: pdfAttachment?.fileName,
      })
      setActionFeedback("Envio concluido com o formato selecionado.")
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
        <div className="print:hidden">
          <Header
            title="Relatorios"
            subtitle="Selecione um cliente para visualizar o relatorio"
          />
        </div>
        <div className="p-8">
          <div className="mx-auto max-w-2xl">
            <FilterSearchInput
              type="text"
              placeholder="Buscar cliente por nome ou empresa..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="mb-6"
              inputClassName="rounded-[26px] py-3.5"
            />

            {loadingClients ? (
              <LoadingSkeleton label="Carregando clientes..." />
            ) : filteredClients.length === 0 ? (
              <EmptyState
                title="Nenhum cliente encontrado"
                description="Ajuste a busca para localizar outro cliente."
                className="border-none py-20"
              />
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
                      <StatusBadge
                        tone={client.status === "ACTIVE" ? "success" : "neutral"}
                      >
                        {client.status === "ACTIVE" ? "Ativo" : "Inativo"}
                      </StatusBadge>
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
      <div className="print:hidden">
        <Header
          title="Relatorio"
          subtitle={`${selectedClient.name} · ${startDate} ate ${endDate}`}
        />
      </div>

      <div className="flex flex-col xl:h-[calc(100vh-72px)] xl:flex-row print:block">
        <aside className="w-full flex-shrink-0 overflow-y-auto border-b border-slate-200/80 bg-[#FCFDFE] p-4 sm:p-6 xl:w-[420px] xl:border-b-0 xl:border-r print:hidden">
          <button
            onClick={() => {
              setSelectedClient(null)
              clearCurrentReport()
            }}
            className="mb-6 inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para a lista
          </button>

          <div className="mb-6 flex items-center gap-3 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
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

          <div className="mb-5 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
            <FilterLabel>Periodo</FilterLabel>
            <div className="mb-4 grid grid-cols-2 gap-2">
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
                  className={`rounded-2xl border px-3 py-2.5 text-xs font-semibold transition ${
                    activePeriod === period.value
                      ? "border-[#C1121F] bg-[#C1121F] text-white shadow-[0_16px_30px_-22px_rgba(193,18,31,0.9)]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {period.label}
                </button>
              ))}
            </div>
            <p className="mb-2 text-xs font-medium text-slate-400">
              Periodo personalizado
            </p>
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(event) => {
                  setStartDate(event.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => {
                  setEndDate(event.target.value)
                  setActivePeriod("custom")
                }}
                className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10"
              />
            </div>
          </div>

          <div className="mb-5 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
            <FilterLabel>Objetivo</FilterLabel>
            <div className="grid gap-2">
              {[
                { label: "Todos", value: "ALL" },
                { label: "Trafego", value: "LINK_CLICKS" },
                { label: "Conversao", value: "CONVERSIONS" },
                { label: "Mensagens", value: "MESSAGES" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setObjective(option.value as ReportObjectiveValue)
                  }
                  className={`flex items-center justify-between rounded-2xl border px-3.5 py-3 text-sm font-medium transition ${
                    objective === option.value
                      ? "border-[#C1121F]/20 bg-[#FFF5F6] text-[#C1121F]"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      objective === option.value ? "bg-[#C1121F]" : "bg-slate-300"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {reportData?.campaigns.length ? (
            <div className="mb-5 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
              <FilterLabel>Campanhas</FilterLabel>
              <CampaignSelector
                campaigns={reportData.campaigns}
                selectedCampaignIds={selectedCampaigns}
                onToggleCampaign={toggleCampaign}
              />
            </div>
          ) : null}

          <div className="mb-5">
            <ReportTemplateEditor
              templateName={templateName}
              customTitle={customTitle}
              executiveSummary={executiveSummary}
              closingNotes={closingNotes}
              sections={sectionVisibility}
              metrics={metricVisibility}
              hasSavedTemplate={Boolean(savedTemplateLabel)}
              savedTemplateLabel={savedTemplateLabel}
              onTemplateNameChange={setTemplateName}
              onCustomTitleChange={setCustomTitle}
              onExecutiveSummaryChange={setExecutiveSummary}
              onClosingNotesChange={setClosingNotes}
              onSectionToggle={toggleSection}
              onMetricToggle={toggleMetric}
              onSaveTemplate={handleSaveTemplate}
              onLoadTemplate={handleLoadTemplate}
            />
          </div>

          <div className="mb-5 rounded-[28px] border border-slate-200/80 bg-white p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-semibold text-slate-800">
                  Insights automaticos
                </span>
                <span className="mt-1 block text-xs text-slate-400">
                  Gera observacoes inteligentes junto com o relatorio.
                </span>
              </span>
              <div
                onClick={() => setInsightsEnabled(!insightsEnabled)}
                className={`relative h-6 w-11 cursor-pointer rounded-full transition ${
                  insightsEnabled ? "bg-[#C1121F]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    insightsEnabled ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </div>
            </label>
          </div>

          <button
            onClick={() => void fetchReport()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C1121F] py-3 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(193,18,31,0.9)] transition hover:bg-[#A50F1A]"
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

        <section className="min-h-0 flex-1 overflow-y-auto bg-[#eef1f6] print:overflow-visible print:bg-white">
          {loadingReport ? (
            <LoadingSkeleton
              label={loadingReportMessage || "Gerando relatorio..."}
              className="h-full"
            />
          ) : reportError ? (
            <div className="flex h-full items-center justify-center px-6">
              <ErrorState
                title="Erro ao carregar relatorio"
                message={reportError}
                action={
                  <button
                    onClick={() => void fetchReport()}
                    className="text-sm font-medium text-[#C1121F] hover:underline"
                  >
                    Tentar novamente
                  </button>
                }
                className="w-full max-w-lg"
              />
            </div>
          ) : !reportData ? (
            <div className="flex h-full items-center justify-center px-6">
              <EmptyState
                title="Nenhum relatorio carregado"
                description='Selecione os filtros e clique em "Aplicar filtros".'
                className="w-full max-w-lg border-none bg-transparent py-20"
              />
            </div>
          ) : (
            <div className="px-4 py-5 pb-28 sm:px-6 sm:py-6 md:px-8 md:py-8 print:px-0 print:py-0">
              {actionFeedback ? (
                <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-700 print:hidden">
                  {actionFeedback}
                </div>
              ) : null}

              {currentReportId ? (
                <div className="mb-5">
                  <SendReportComposer
                    mode={sendMode}
                    message={sendMessage}
                    groupLabel={selectedClient.whatsappGroupId || "Grupo do cliente"}
                    templateName={templateName}
                    disabled={isSending}
                    onModeChange={setSendMode}
                    onMessageChange={setSendMessage}
                  />
                </div>
              ) : null}

              <div ref={reportRef}>
                <ReportPreview
                  client={selectedClient}
                  reportData={reportData}
                  startDate={startDate}
                  endDate={endDate}
                  objective={objective}
                  selectedCampaignIds={selectedCampaigns}
                  insightsEnabled={insightsEnabled}
                  metricVisibility={metricVisibility}
                  customTitle={customTitle}
                  executiveSummary={executiveSummary}
                  closingNotes={closingNotes}
                  sectionVisibility={sectionVisibility}
                />
              </div>
            </div>
          )}

          {reportData ? (
            <div className="sticky bottom-0 z-10 flex flex-col gap-3 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8 print:hidden">
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
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
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

      {selectedClient && reportData ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed left-[-200vw] top-0 w-[1120px] overflow-hidden bg-white"
        >
          <div ref={pdfReportRef}>
            <ReportPreview
              client={selectedClient}
              reportData={reportData}
              startDate={startDate}
              endDate={endDate}
              objective={objective}
              selectedCampaignIds={selectedCampaigns}
              insightsEnabled={insightsEnabled}
              metricVisibility={metricVisibility}
              customTitle={customTitle}
              executiveSummary={executiveSummary}
              closingNotes={closingNotes}
              sectionVisibility={sectionVisibility}
              variant="pdf"
            />
          </div>
        </div>
      ) : null}
    </>
  )
}
