import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  buildReportJobErrorPayload,
  parsePendingReportJobPayload,
  parseStoredReportPayload,
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

    const storedPayload =
      parseStoredReportPayload(report.payloadJson) ?? pendingJob.storedPayload ?? null

    await prisma.report.update({
      where: { id: report.id },
      data: {
        status: "FAILED",
        payloadJson: storedPayload
          ? buildReportJobErrorPayload(CANCEL_MESSAGE, "SEND")
          : buildReportJobErrorPayload(CANCEL_MESSAGE, "SEND"),
      },
    })

    return NextResponse.json<ReportCancelResponse>({
      ok: true,
      reportId: report.id,
      status: "FAILED",
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
