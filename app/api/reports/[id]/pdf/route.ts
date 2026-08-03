import { jsPDF } from "jspdf"
import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { buildReportPdfBufferWithFallback } from "@/lib/report-pdf-fallback"
import { buildReportPdfFileName } from "@/lib/report-pdf-shared"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { prisma } from "@/lib/prisma"
import { logError, logInfo } from "@/lib/safe-logger"

function buildContentDisposition(fileName: string) {
  const safeFileName = fileName.replace(/"/g, '\\"')
  return `attachment; filename="${safeFileName}"`
}

function validatePdfBuffer(pdfBuffer: Uint8Array, reportId: string) {
  if (!(pdfBuffer instanceof Uint8Array)) {
    throw new Error("O PDF retornado é inválido.")
  }

  if (pdfBuffer.byteLength === 0) {
    throw new Error("O PDF retornado está vazio.")
  }

  if (
    pdfBuffer[0] !== 0x25 ||
    pdfBuffer[1] !== 0x50 ||
    pdfBuffer[2] !== 0x44 ||
    pdfBuffer[3] !== 0x46
  ) {
    throw new Error("O PDF retornado não contém a assinatura esperada.")
  }

  logInfo("reports.pdf.get", {
    reportId,
    size: pdfBuffer.byteLength,
    step: "buffer-valid",
  })
}

function buildEmergencyPdfBuffer(params: {
  reportId: string
  clientName: string
  referenceWeek: Date
  reason: string
}) {
  const pdf = new jsPDF({
    orientation: "p",
    unit: "mm",
    format: "a4",
    compress: true,
  })

  const period = params.referenceWeek.toLocaleDateString("pt-BR")

  pdf.setDocumentProperties({
    title: `Relatório META Ads | ${params.clientName}`,
    subject: "Relatório de performance META Ads",
    author: "GreatGo",
    creator: "GreatGo",
    keywords: ["greatgo", "meta ads", params.clientName, params.reportId].join(", "),
  })

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(22)
  pdf.text("Relatório", 20, 25)

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.text(
    "Não foi possível gerar a versão completa agora. O PDF de contingência foi criado automaticamente.",
    20,
    35,
    {
      maxWidth: 170,
    }
  )

  pdf.setFont("helvetica", "bold")
  pdf.setFontSize(12)
  pdf.text("Cliente", 20, 52)
  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(11)
  pdf.text(params.clientName, 20, 60)

  pdf.setFont("helvetica", "bold")
  pdf.text("Período", 20, 74)
  pdf.setFont("helvetica", "normal")
  pdf.text(period, 20, 82)

  pdf.setFont("helvetica", "bold")
  pdf.text("Status", 20, 96)
  pdf.setFont("helvetica", "normal")
  pdf.text(params.reason, 20, 104, { maxWidth: 170 })

  pdf.setFont("helvetica", "normal")
  pdf.setFontSize(9)
  pdf.text(`Referência: ${params.reportId}`, 20, 280)

  return new Uint8Array(pdf.output("arraybuffer"))
}

function buildPdfResponse(buffer: Uint8Array, fileName: string) {
  return new NextResponse(Buffer.from(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": buildContentDisposition(fileName),
      "Content-Length": String(buffer.byteLength),
      "Cache-Control": "no-store",
    },
  })
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            name: true,
            managerId: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, report.client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este relatório" }, { status: 403 })
    }

    const payload = parseStoredReportPayload(report.payloadJson)
    const fallbackClientName = report.client.name || "Cliente não informado"
    const fallbackReferenceWeek = report.referenceWeek ?? new Date()

    const pdfBuffer = payload
      ? await buildReportPdfBufferWithFallback({
          reportId: report.id,
          payload,
        }).catch((error) => {
          logError("reports.pdf.get.fallback", error, { reportId: report.id })
          return buildEmergencyPdfBuffer({
            reportId: report.id,
            clientName: payload.client.name || fallbackClientName,
            referenceWeek: fallbackReferenceWeek,
            reason: "O PDF completo não pôde ser gerado. Foi entregue uma versão de contingência.",
          })
        })
      : buildEmergencyPdfBuffer({
          reportId: report.id,
          clientName: fallbackClientName,
          referenceWeek: fallbackReferenceWeek,
          reason: "O relatório ainda está em processamento, então foi gerada uma versão de contingência.",
        })

    validatePdfBuffer(pdfBuffer, report.id)

    const fileName = payload
      ? `${buildReportPdfFileName({
          clientName: payload.client.name,
          startDate: payload.filters.since,
          endDate: payload.filters.until,
        })}.pdf`
      : `greatgo-relatorio-meta-ads-${report.id}.pdf`

    return buildPdfResponse(pdfBuffer, fileName)
  } catch (error) {
    logError("reports.pdf.get", error)

    const emergencyPdf = buildEmergencyPdfBuffer({
      reportId: "unknown",
      clientName: "Relatório",
      referenceWeek: new Date(),
      reason: "Não foi possível concluir a geração. A versão de contingência foi criada automaticamente.",
    })

    return buildPdfResponse(emergencyPdf, "greatgo-relatorio-meta-ads-contingencia.pdf")
  }
}

