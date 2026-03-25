import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { ensureReportWorkersStarted } from "@/lib/report-jobs"
import { prisma } from "@/lib/prisma"
import { enqueueReportSendJob } from "@/lib/report-queue"
import { logError } from "@/lib/safe-logger"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureReportWorkersStarted()
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

    const job = await enqueueReportSendJob({
      reportId: report.id,
    })

    return NextResponse.json(
      {
        ok: true,
        queued: true,
        reportId: report.id,
        jobId: job.id,
        status: report.status,
      },
      { status: 202 }
    )
  } catch (error) {
    logError("reports.send.unhandled", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
