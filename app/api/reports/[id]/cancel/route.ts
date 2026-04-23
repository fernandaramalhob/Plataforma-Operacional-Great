import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  buildReportJobErrorPayload,
  parsePendingReportJobPayload,
} from "@/lib/report-domain"
import { logError } from "@/lib/safe-logger"
import type { ApiErrorResponse } from "@/types/api.types"
import type { ReportCancelResponse } from "@/types/report.types"

const CANCEL_MESSAGE = "Envio cancelado pelo usuário."

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const { id } = await params
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            managerId: true,
            whatsappGroupId: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Relatório não encontrado" },
        { status: 404 }
      )
    }

    if (!canAccessClient(user, report.client.managerId)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Acesso negado a este relatório" },
        { status: 403 }
      )
    }

    if (report.status !== "PENDING") {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Só é possível cancelar envios pendentes.",
        },
        { status: 409 }
      )
    }

    const pendingJob = parsePendingReportJobPayload(report.payloadJson)

    if (!pendingJob) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Este relatório não está em fila de envio.",
        },
        { status: 409 }
      )
    }

    const scheduledAt = pendingJob.queuedAt
    const nextAttemptAt = pendingJob.nextAttemptAt ?? pendingJob.queuedAt
    const groupId =
      pendingJob.sendOptions?.groupId ?? report.client.whatsappGroupId ?? null

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: "CANCELLED",
        payloadJson: buildReportJobErrorPayload(CANCEL_MESSAGE, "SEND", {
          scheduledAt,
          nextAttemptAt,
          groupId,
          groupName: null,
        }),
      },
    })

    return NextResponse.json<ReportCancelResponse>({
      ok: true,
      reportId: report.id,
      status: "CANCELLED",
      cancelled: true,
    })
  } catch (error) {
    logError("reports.cancel.post", error)
    return NextResponse.json<ApiErrorResponse>(
      {
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    )
  }
}
