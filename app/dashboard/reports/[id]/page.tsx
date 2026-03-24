"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Header } from "@/components/layout/header"
import { ReportPreview } from "@/components/reports/report-preview"
import { logError } from "@/lib/safe-logger"
import type { ReportCampaign, SavedReportResponse } from "@/types/report.types"
import {
  Calendar,
  ChevronLeft,
  Download,
  Loader2,
  Send,
} from "lucide-react"

function sanitizeFileName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

export default function ReportPreviewPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [savedReport, setSavedReport] = useState<SavedReportResponse | null>(null)
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<string[]>([])
  const [insightsEnabled, setInsightsEnabled] = useState(true)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState(false)
  const [actionFeedback, setActionFeedback] = useState("")

  useEffect(() => {
    const reportId = Array.isArray(params.id) ? params.id[0] : params.id

    if (!reportId) {
      setError("Relatorio invalido")
      setLoading(false)
      return
    }

    setLoading(true)
    setError("")
    setActionFeedback("")

    fetch(`/api/reports/${reportId}`)
      .then(async (response) => {
        const data = (await response.json()) as SavedReportResponse | { error?: string }

        if (!response.ok) {
          throw new Error(
            "error" in data && typeof data.error === "string"
              ? data.error
              : "Nao foi possivel carregar o relatorio"
          )
        }

        const parsedData = data as SavedReportResponse
        setSavedReport(parsedData)
        setSelectedCampaignIds(
          parsedData.payload.campaigns.map((campaign) => campaign.id)
        )
      })
      .catch((fetchError: unknown) => {
        setSavedReport(null)
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Nao foi possivel carregar o relatorio"
        )
      })
      .finally(() => setLoading(false))
  }, [params.id])

  function toggleCampaign(id: string) {
    setSelectedCampaignIds((current) =>
      current.includes(id)
        ? current.filter((campaignId) => campaignId !== id)
        : [...current, id]
    )
  }

  async function handleGeneratePDF() {
    if (!reportRef.current || !savedReport) {
      return
    }

    setGenerating(true)

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
        sanitizeFileName(savedReport.payload.client.name),
        savedReport.payload.filters.since,
        savedReport.payload.filters.until,
      ]
        .filter(Boolean)
        .join("-")

      pdf.save(`${fileName}.pdf`)
    } catch (pdfError) {
      logError("dashboard.report-preview.page", pdfError, {
        reportId: savedReport.id,
      })
      setError("Nao foi possivel gerar o PDF do relatorio")
    } finally {
      setGenerating(false)
    }
  }

  async function handleSendReport() {
    if (!savedReport) {
      return
    }

    setSending(true)
    setError("")
    setActionFeedback("")

    try {
      const response = await fetch(`/api/reports/${savedReport.id}/send`, {
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
    } catch (sendError) {
      setError(
        sendError instanceof Error
          ? sendError.message
          : "Nao foi possivel enviar o relatorio"
      )
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div>
        <Header
          title="Relatorio salvo"
          subtitle="Carregando relatorio persistido"
        />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-[#C1121F]" />
        </div>
      </div>
    )
  }

  if (!savedReport) {
    return (
      <div>
        <Header
          title="Relatorio salvo"
          subtitle="Nao foi possivel abrir este relatorio"
        />
        <div className="p-8">
          <div className="rounded-2xl border border-red-100 bg-red-50 p-6 text-sm text-red-600">
            <p>{error || "Relatorio nao encontrado"}</p>
            <button
              onClick={() => router.push("/dashboard/history")}
              className="mt-4 inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar para o historico
            </button>
          </div>
        </div>
      </div>
    )
  }

  const { payload } = savedReport

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-[#F8FAFC]">
        <Header
          title="Relatorio salvo"
          subtitle={`${payload.client.name} · ${payload.filters.since} ate ${payload.filters.until}`}
        />
      </div>

      <div className="flex h-[calc(100vh-72px)]">
        <aside className="w-[300px] flex-shrink-0 overflow-y-auto border-r border-gray-100 bg-white p-5">
          <button
            onClick={() => router.push("/dashboard/history")}
            className="mb-5 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para o historico
          </button>

          <div className="mb-5 rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Cliente
            </p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {payload.client.name}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {payload.client.company ?? "Marca nao informada"}
            </p>
          </div>

          <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
              Filtros salvos
            </p>
            <div className="mt-3 space-y-2 text-sm text-gray-600">
              <p>De: {payload.filters.since}</p>
              <p>Ate: {payload.filters.until}</p>
              <p>Objetivo: {payload.filters.objective}</p>
              <p>Gerado em: {new Date(savedReport.generatedAt).toLocaleString("pt-BR")}</p>
            </div>
          </div>

          {payload.campaigns.length ? (
            <div className="mb-5">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500">
                Campanhas
              </label>
              <div className="space-y-2">
                {payload.campaigns.map((campaign: ReportCampaign) => (
                  <label
                    key={campaign.id}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCampaignIds.includes(campaign.id)}
                      onChange={() => toggleCampaign(campaign.id)}
                      className="accent-[#C1121F]"
                    />
                    <span className="flex-1 truncate text-xs text-gray-700">
                      {campaign.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm text-gray-700">
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
            Insights automaticos
          </label>
        </aside>

        <section className="flex-1 overflow-y-auto bg-[#eef1f6]">
          <div className="px-8 py-8 pb-28">
            {actionFeedback ? (
              <div className="mb-6 rounded-2xl border border-green-100 bg-green-50 px-5 py-4 text-sm text-green-700">
                {actionFeedback}
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-sm text-red-600">
                {error}
              </div>
            ) : null}

            <div ref={reportRef}>
              <ReportPreview
                client={payload.client}
                reportData={payload}
                startDate={payload.filters.since}
                endDate={payload.filters.until}
                selectedCampaignIds={selectedCampaignIds}
                insightsEnabled={insightsEnabled}
              />
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex items-center justify-between border-t border-gray-200 bg-white/95 px-8 py-4 backdrop-blur">
            <button
              onClick={() => router.push("/dashboard/history")}
              className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50">
                <Calendar className="h-4 w-4" />
                Agendar envio
              </button>
              <button
                onClick={() => void handleSendReport()}
                disabled={sending}
                className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                {sending ? "Enviando..." : "Enviar por WhatsApp"}
              </button>
              <button
                onClick={() => void handleGeneratePDF()}
                disabled={generating}
                className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                {generating ? "Gerando PDF..." : "Salvar relatorio em PDF"}
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  )
}
