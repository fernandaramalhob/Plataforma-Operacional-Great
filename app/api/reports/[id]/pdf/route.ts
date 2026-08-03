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

export async function GET(
  _request: Request,
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
            managerId: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: "Relatório não encontrado" },
        { status: 404 }
      )
    }

    if (!canAccessClient(user, report.client.managerId)) {
      return NextResponse.json(
        { error: "Acesso negado a este relatório" },
        { status: 403 }
      )
    }

    const payload = parseStoredReportPayload(report.payloadJson)

    if (!payload) {
      return NextResponse.json(
        { error: "Relatório ainda esta em processamento" },
        { status: 409 }
      )
    }

    const pdfBuffer = await buildReportPdfBufferWithFallback({
      reportId: report.id,
      payload,
    })

    validatePdfBuffer(pdfBuffer, report.id)

    const fileName = `${buildReportPdfFileName({
      clientName: payload.client.name,
      startDate: payload.filters.since,
      endDate: payload.filters.until,
    })}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": buildContentDisposition(fileName),
        "Content-Length": String(pdfBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logError("reports.pdf.get", error)
    return NextResponse.json(
      { error: "Não foi possível gerar o PDF do relatório." },
      { status: 500 }
    )
  }
}
