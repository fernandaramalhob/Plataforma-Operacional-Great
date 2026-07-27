import { jsPDF } from "jspdf"
import { buildStandardReportPdfBuffer } from "@/lib/report-pdf-standard"
import { logError } from "@/lib/safe-logger"
import type { StoredReportPayload } from "@/types/report.types"

function buildEmergencyPdfBuffer(reportId: string) {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(18)
  pdf.text("Relatório indisponível", 20, 28)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.text(
    "O PDF não pôde ser renderizado agora, mas o arquivo foi gerado com segurança.",
    20,
    42,
    { maxWidth: 170 }
  )
  pdf.text(`ID do relatório: ${reportId}`, 20, 54)
  pdf.text("Tente novamente em alguns instantes.", 20, 66)

  return Buffer.from(pdf.output("arraybuffer"))
}

export async function buildReportPdfBufferWithFallback(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  try {
    return buildStandardReportPdfBuffer({
      reportId: params.reportId,
      payload: params.payload,
    })
  } catch (error) {
    logError("report-pdf-fallback.standard-fallback", error, {
      reportId: params.reportId,
    })

    return buildEmergencyPdfBuffer(params.reportId)
  }
}
