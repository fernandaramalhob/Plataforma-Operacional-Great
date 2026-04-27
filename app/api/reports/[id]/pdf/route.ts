import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { buildReportPdfBufferWithFallback } from "@/lib/report-pdf-fallback"
import { buildReportPdfFileName } from "@/lib/report-pdf-shared"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

function buildContentDisposition(fileName: string) {
  const safeFileName = fileName.replace(/"/g, '\\"')
  return `attachment; filename="${safeFileName}"`
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
        "Cache-Control": "no-store",
      },
    })
  } catch (error) {
    logError("reports.pdf.get", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
