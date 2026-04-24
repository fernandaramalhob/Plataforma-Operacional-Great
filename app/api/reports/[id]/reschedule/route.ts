import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  buildPendingReportJobPayload,
  parsePendingReportJobPayload,
} from "@/lib/report-domain"
import { logError } from "@/lib/safe-logger"
import type { ReportRescheduleResponse } from "@/types/report.types"

function parseScheduledAt(value: unknown) {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  const scheduledAt = new Date(trimmed)

  if (Number.isNaN(scheduledAt.getTime())) {
    return null
  }

  return scheduledAt
}

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
            managerId: true,
          },
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

    if (report.status !== "PENDING") {
      return NextResponse.json(
        { error: "Apenas relatorios pendentes podem ser reagendados" },
        { status: 409 }
      )
    }

    const pendingJob = parsePendingReportJobPayload(report.payloadJson)

    if (!pendingJob) {
      return NextResponse.json(
        { error: "Relatorio nao possui agendamento pendente" },
        { status: 409 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      scheduledAt?: unknown
    }
    const scheduledAt = parseScheduledAt(body.scheduledAt)

    if (!scheduledAt) {
      return NextResponse.json(
        { error: "Informe uma data e horario validos" },
        { status: 400 }
      )
    }

    if (scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Escolha um horario futuro para reagendar" },
        { status: 400 }
      )
    }

    const updatedJob = {
      ...pendingJob,
      nextAttemptAt: scheduledAt.toISOString(),
      lastAttemptAt: null,
      lastError: null,
      lease: null,
    }

    await prisma.report.update({
      where: { id },
      data: {
        status: "PENDING",
        payloadJson: buildPendingReportJobPayload(updatedJob),
      },
    })

    const response: ReportRescheduleResponse = {
      ok: true,
      reportId: report.id,
      scheduledAt: scheduledAt.toISOString(),
      status: "PENDING",
    }

    return NextResponse.json(response)
  } catch (error) {
    logError("reports.reschedule.unhandled", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
