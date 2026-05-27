import type { Prisma } from "@prisma/client"
import { after, NextResponse } from "next/server"
import {
  canAccessReportClient,
  getCurrentUser,
} from "@/lib/authorization"
import {
  parsePendingReportJobPayload,
  parseReportJobErrorPayload,
  parseStoredReportPayload,
} from "@/lib/report-domain"
import { prisma } from "@/lib/prisma"
import { processQueuedReportSafely } from "@/lib/report-processing"
import { logError } from "@/lib/safe-logger"
import type { SavedReportMessageResponse } from "@/types/report.types"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
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
    let report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            managerId: true,
          },
        },
        sendLogs: {
          select: {
            errorMessage: true,
          },
          orderBy: {
            attemptNumber: "desc",
          },
          take: 1,
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Relatório não encontrado" }, { status: 404 })
    }

    if (!canAccessReportClient(user, report.client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este relatório" }, { status: 403 })
    }

    const initialPendingJob = parsePendingReportJobPayload(report.payloadJson)
    if (report.status === "PENDING" && initialPendingJob) {
      await processQueuedReportSafely(report.id)

      const refreshedReport = await prisma.report.findUnique({
        where: { id },
        include: {
          client: {
            select: {
              managerId: true,
            },
          },
          sendLogs: {
            select: {
              errorMessage: true,
            },
            orderBy: {
              attemptNumber: "desc",
            },
            take: 1,
          },
        },
      })

      if (refreshedReport) {
        report = refreshedReport
      }
    }

    const payload = parseStoredReportPayload(report.payloadJson)
    const jobError = parseReportJobErrorPayload(report.payloadJson)
    const pendingJob = parsePendingReportJobPayload(report.payloadJson)
    const errorMessage = report.sendLogs[0]?.errorMessage ?? jobError?.message ?? null

    if (report.status === "PENDING" && pendingJob) {
      after(() => processQueuedReportSafely(report.id))
    }

    if (!payload) {
      return NextResponse.json(
        {
          id: report.id,
          status: report.status,
          generatedAt: report.generatedAt.toISOString(),
          referenceWeek: report.referenceWeek.toISOString(),
          payload: null,
          errorMessage,
        },
        { status: report.status === "PENDING" ? 202 : 200 }
      )
    }

    return NextResponse.json({
      id: report.id,
      status: report.status,
      generatedAt: report.generatedAt.toISOString(),
      referenceWeek: report.referenceWeek.toISOString(),
      payload,
      errorMessage,
    })
  } catch (error) {
    logError("reports.by-id.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(
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

    if (!canAccessReportClient(user, report.client.managerId)) {
      return NextResponse.json(
        { error: "Acesso negado a este relatório" },
        { status: 403 }
      )
    }

    const payload = parseStoredReportPayload(report.payloadJson)
    if (!payload || !isRecord(report.payloadJson)) {
      return NextResponse.json(
        { error: "Relatório ainda está em processamento" },
        { status: 409 }
      )
    }

    const body = (await request.json().catch(() => ({}))) as {
      message?: string | null
    }
    const message = typeof body.message === "string" ? body.message.trim() : ""
    const nextMessage = message || null
    const payloadJson = { ...(report.payloadJson as Record<string, unknown>) }

    if (isRecord(payloadJson.pendingJob) && isRecord(payloadJson.pendingJob.storedPayload)) {
      payloadJson.pendingJob = {
        ...payloadJson.pendingJob,
        storedPayload: {
          ...payloadJson.pendingJob.storedPayload,
          uiMessageOverride: nextMessage,
        },
      }
    } else {
      payloadJson.uiMessageOverride = nextMessage
    }

    await prisma.report.update({
      where: { id },
      data: {
        payloadJson: payloadJson as Prisma.InputJsonValue,
      },
    })

    const response: SavedReportMessageResponse = {
      ok: true,
      reportId: report.id,
      message: nextMessage,
    }

    return NextResponse.json(response)
  } catch (error) {
    logError("reports.by-id.put", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
