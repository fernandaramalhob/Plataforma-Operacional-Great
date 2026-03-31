import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import type { ReportSendRequest } from "@/types/report.types"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            managerId: true,
            whatsappGroupId: true,
          },
        },
        sendLogs: {
          select: {
            attemptNumber: true,
          },
          orderBy: {
            attemptNumber: "desc",
          },
          take: 1,
        },
      },
    })

    if (!report) {
      return NextResponse.json(
        { error: "Relatorio nao encontrado" },
        { status: 404 }
      )
    }

    if (!canAccessClient(user, report.client.managerId)) {
      return NextResponse.json(
        { error: "Acesso negado a este relatorio" },
        { status: 403 }
      )
    }

    const payload = parseStoredReportPayload(report.payloadJson)

    if (!payload) {
      return NextResponse.json(
        { error: "Relatorio ainda esta em processamento" },
        { status: 409 }
      )
    }

    if (!report.client.whatsappGroupId) {
      return NextResponse.json(
        { error: "Cliente sem grupo de WhatsApp configurado" },
        { status: 400 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as ReportSendRequest
    const delivery = await sendPersistedReportNow(report.id, {
      mode: body.mode,
      message: body.message,
      pdfBase64: body.pdfBase64,
      pdfFileName: body.pdfFileName,
    })

    return NextResponse.json(
      {
        ok: true,
        queued: false,
        reportId: report.id,
        jobId: null,
        status: delivery.status,
      },
      { status: 200 }
    )
  } catch (error) {
    logError("reports.send.unhandled", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
