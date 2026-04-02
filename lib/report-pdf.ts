"use client"

import { buildReportPdfFileName } from "@/lib/report-pdf-shared"

type ExportReportPdfInput = {
  sourceElement: HTMLElement
  clientName: string
  startDate: string
  endDate: string
  objective?: string
  generatedAt?: string | Date
  reportId?: string
}

const PDF_MARGIN_MM = 8

function formatDateForTitle(value: string) {
  if (!value) {
    return "-"
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}

function buildReportPdfTitle(input: {
  clientName: string
  startDate: string
  endDate: string
}) {
  return `Relatório META Ads | ${input.clientName} | ${formatDateForTitle(
    input.startDate
  )} a ${formatDateForTitle(input.endDate)}`
}

async function renderCanvas(
  html2canvas: typeof import("html2canvas").default,
  element: HTMLElement,
  scale: number
) {
  return html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    logging: false,
  })
}

function addCanvasToPdf(params: {
  pdf: import("jspdf").jsPDF
  canvas: HTMLCanvasElement
  contentWidth: number
  contentHeight: number
}) {
  const { pdf, canvas, contentWidth, contentHeight } = params
  const imageData = canvas.toDataURL("image/png")

  let renderedWidth = contentWidth
  let renderedHeight = (canvas.height * renderedWidth) / canvas.width

  if (renderedHeight > contentHeight) {
    renderedHeight = contentHeight
    renderedWidth = (canvas.width * renderedHeight) / canvas.height
  }

  const offsetX = PDF_MARGIN_MM + (contentWidth - renderedWidth) / 2
  const offsetY = PDF_MARGIN_MM + (contentHeight - renderedHeight) / 2

  pdf.addImage(
    imageData,
    "PNG",
    offsetX,
    offsetY,
    renderedWidth,
    renderedHeight,
    undefined,
    "MEDIUM"
  )
}

function createPageCanvas(
  sourceCanvas: HTMLCanvasElement,
  startY: number,
  sliceHeight: number
) {
  const pageCanvas = document.createElement("canvas")
  pageCanvas.width = sourceCanvas.width
  pageCanvas.height = sliceHeight

  const context = pageCanvas.getContext("2d")

  if (!context) {
    throw new Error("Não foi possível preparar a página do PDF")
  }

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
  context.drawImage(
    sourceCanvas,
    0,
    startY,
    sourceCanvas.width,
    sliceHeight,
    0,
    0,
    sourceCanvas.width,
    sliceHeight
  )

  return pageCanvas
}

async function buildPdfDocument(input: ExportReportPdfInput) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const renderScale = Math.max(window.devicePixelRatio || 1, 3)
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  const fileName = buildReportPdfFileName({
    clientName: input.clientName,
    startDate: input.startDate,
    endDate: input.endDate,
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2
  const contentHeight = pageHeight - PDF_MARGIN_MM * 2

  pdf.setDocumentProperties({
    title: buildReportPdfTitle(input),
    subject: "Relatório de performance META Ads",
    author: "GreatGo",
    creator: "GreatGo",
    keywords: [
      "greatgo",
      "meta ads",
      "relatório",
      input.clientName,
      input.objective,
      input.reportId,
    ]
      .filter(Boolean)
      .join(", "),
  })
  pdf.setCreationDate(input.generatedAt ? new Date(input.generatedAt) : new Date())
  pdf.setDisplayMode("fullwidth", "continuous")
  pdf.viewerPreferences({ DisplayDocTitle: true })

  const pageElements = Array.from(
    input.sourceElement.querySelectorAll<HTMLElement>("[data-report-pdf-page]")
  )

  if (pageElements.length > 0) {
    for (const [index, pageElement] of pageElements.entries()) {
      const canvas = await renderCanvas(html2canvas, pageElement, renderScale)

      if (index > 0) {
        pdf.addPage()
      }

      addCanvasToPdf({
        pdf,
        canvas,
        contentWidth,
        contentHeight,
      })
    }

    return { pdf, fileName }
  }

  const canvas = await renderCanvas(html2canvas, input.sourceElement, renderScale)
  const pxPerMm = canvas.width / contentWidth
  const pagePixelHeight = Math.max(Math.floor(contentHeight * pxPerMm), 1)
  let currentY = 0
  let isFirstPage = true

  while (currentY < canvas.height) {
    const sliceHeight = Math.min(pagePixelHeight, canvas.height - currentY)
    const pageCanvas = createPageCanvas(canvas, currentY, sliceHeight)

    if (!isFirstPage) {
      pdf.addPage()
    }

    addCanvasToPdf({
      pdf,
      canvas: pageCanvas,
      contentWidth,
      contentHeight,
    })

    currentY += sliceHeight
    isFirstPage = false
  }

  return { pdf, fileName }
}

export async function exportReportPdf({
  sourceElement,
  clientName,
  startDate,
  endDate,
  objective,
  generatedAt,
  reportId,
}: ExportReportPdfInput) {
  const { pdf, fileName } = await buildPdfDocument({
    sourceElement,
    clientName,
    startDate,
    endDate,
    objective,
    generatedAt,
    reportId,
  })

  pdf.save(`${fileName}.pdf`)
}

export async function buildReportPdfFilePayload(input: ExportReportPdfInput) {
  const { pdf, fileName } = await buildPdfDocument(input)
  const blob = pdf.output("blob")
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = typeof reader.result === "string" ? reader.result : ""
      const [, payload = ""] = result.split(",", 2)
      resolve(payload)
    }
    reader.onerror = () => reject(new Error("Não foi possível codificar o PDF"))
    reader.readAsDataURL(blob)
  })

  return {
    fileName: `${fileName}.pdf`,
    base64,
  }
}
