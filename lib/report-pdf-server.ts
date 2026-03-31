import { jsPDF } from "jspdf"
import {
  parseReportNumber,
  resolveObjectiveMetric,
} from "@/lib/report-metrics"
import type { StoredReportPayload } from "@/types/report.types"

function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })
}

function formatInteger(value: number) {
  return value.toLocaleString("pt-BR")
}

function formatPercentage(value: number) {
  return `${value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`
}

function formatDate(date: string) {
  if (!date) {
    return "-"
  }

  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR")
}

function addWrappedText(pdf: jsPDF, text: string, x: number, y: number, width: number) {
  const lines = pdf.splitTextToSize(text, width)
  pdf.text(lines, x, y)
  return y + lines.length * 6
}

export function buildReportPdfBuffer(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  const { reportId, payload } = params
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })
  const margin = 14
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const accountInsights = payload.accountInsights ?? {}
  const spend = parseReportNumber(accountInsights.spend)
  const impressions = parseReportNumber(accountInsights.impressions)
  const reach = parseReportNumber(accountInsights.reach)
  const clicks = parseReportNumber(accountInsights.clicks)
  const ctr = parseReportNumber(accountInsights.ctr)
  const cpc = parseReportNumber(accountInsights.cpc)
  const cpm = parseReportNumber(accountInsights.cpm)
  const objectiveMetric = resolveObjectiveMetric(
    accountInsights,
    payload.filters.objective
  )

  pdf.setDocumentProperties({
    title: `Relatorio META Ads | ${payload.client.name}`,
    subject: "Relatorio de performance META Ads",
    author: "GreatGo",
    creator: "GreatGo",
    keywords: ["greatgo", "meta ads", payload.client.name, reportId].join(", "),
  })

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(20)
  pdf.text("GreatGo | Relatorio META Ads", margin, y)
  y += 10

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  y = addWrappedText(
    pdf,
    `Cliente: ${payload.client.name}\nEmpresa: ${payload.client.company ?? "Nao informada"}\nPeriodo: ${formatDate(
      payload.filters.since
    )} ate ${formatDate(payload.filters.until)}\nObjetivo: ${payload.filters.objective}\nRelatorio: ${reportId}`,
    margin,
    y,
    contentWidth
  )
  y += 4

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(14)
  pdf.text("Resumo da conta", margin, y)
  y += 8
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)

  y = addWrappedText(
    pdf,
    [
      `Investimento: ${formatCurrency(spend)}`,
      `Impressoes: ${formatInteger(impressions)}`,
      `Alcance: ${formatInteger(reach)}`,
      `Cliques: ${formatInteger(clicks)}`,
      `CTR: ${formatPercentage(ctr)}`,
      `CPC: ${formatCurrency(cpc)}`,
      `CPM: ${formatCurrency(cpm)}`,
      `${objectiveMetric.label}: ${formatInteger(objectiveMetric.value)}`,
      objectiveMetric.costPerResult !== null
        ? `${objectiveMetric.costLabel}: ${formatCurrency(objectiveMetric.costPerResult)}`
        : null,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    margin,
    y,
    contentWidth
  )
  y += 8

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(14)
  pdf.text("Campanhas", margin, y)
  y += 8
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(10)

  for (const campaign of payload.campaigns) {
    const insight = campaign.insights?.data?.[0] ?? {}
    const campaignMetric = resolveObjectiveMetric(insight, payload.filters.objective)
    const estimatedHeight = 28

    if (y + estimatedHeight > pageHeight - margin) {
      pdf.addPage()
      y = margin
    }

    pdf.setFont("helvetica", "bold")
    pdf.text(campaign.name, margin, y)
    y += 5
    pdf.setFont("helvetica", "normal")

    y = addWrappedText(
      pdf,
      [
        `Status: ${campaign.status}`,
        `Objetivo: ${campaign.objective ?? "Nao informado"}`,
        `${campaignMetric.label}: ${formatInteger(campaignMetric.value)}`,
        `Cliques: ${formatInteger(parseReportNumber(insight.clicks))}`,
        `Impressoes: ${formatInteger(parseReportNumber(insight.impressions))}`,
        `Gasto: ${formatCurrency(parseReportNumber(insight.spend))}`,
      ].join("\n"),
      margin,
      y,
      contentWidth
    )
    y += 4
  }

  return Buffer.from(pdf.output("arraybuffer"))
}
