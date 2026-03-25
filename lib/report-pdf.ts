"use client"

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

function sanitizeFileNamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

function formatDateForTitle(value: string) {
  if (!value) {
    return "-"
  }

  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR")
}

export function buildReportPdfFileName(input: {
  clientName: string
  startDate: string
  endDate: string
}) {
  return [
    "greatgo-relatorio-meta-ads",
    sanitizeFileNamePart(input.clientName),
    input.startDate,
    "a",
    input.endDate,
  ]
    .filter(Boolean)
    .join("-")
}

function buildReportPdfTitle(input: {
  clientName: string
  startDate: string
  endDate: string
}) {
  return `Relatorio META Ads | ${input.clientName} | ${formatDateForTitle(
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
    "FAST"
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
    throw new Error("Nao foi possivel preparar a pagina do PDF")
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

export async function exportReportPdf({
  sourceElement,
  clientName,
  startDate,
  endDate,
  objective,
  generatedAt,
  reportId,
}: ExportReportPdfInput) {
  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const renderScale = Math.max(window.devicePixelRatio || 1, 2)
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  const fileName = buildReportPdfFileName({
    clientName,
    startDate,
    endDate,
  })
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const contentWidth = pageWidth - PDF_MARGIN_MM * 2
  const contentHeight = pageHeight - PDF_MARGIN_MM * 2

  pdf.setDocumentProperties({
    title: buildReportPdfTitle({ clientName, startDate, endDate }),
    subject: "Relatorio de performance META Ads",
    author: "GreatGo",
    creator: "GreatGo",
    keywords: [
      "greatgo",
      "meta ads",
      "relatorio",
      clientName,
      objective,
      reportId,
    ]
      .filter(Boolean)
      .join(", "),
  })
  pdf.setCreationDate(generatedAt ? new Date(generatedAt) : new Date())
  pdf.setDisplayMode("fullwidth", "continuous")
  pdf.viewerPreferences({ DisplayDocTitle: true })

  const pageElements = Array.from(
    sourceElement.querySelectorAll<HTMLElement>("[data-report-pdf-page]")
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

    pdf.save(`${fileName}.pdf`)
    return
  }

  const canvas = await renderCanvas(html2canvas, sourceElement, renderScale)
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

  pdf.save(`${fileName}.pdf`)
}
