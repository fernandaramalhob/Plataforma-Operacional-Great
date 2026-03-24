import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { sendWhatsAppText } from "@/lib/evolution-api"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { buildWhatsAppReportMessage } from "@/lib/report-message"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function POST(
  _request: Request,
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

    const attemptNumber = (report.sendLogs[0]?.attemptNumber ?? 0) + 1
    const sendLog = await prisma.sendLog.create({
      data: {
        reportId: report.id,
        channel: "WHATSAPP_GROUP",
        attemptNumber,
        status: "PENDING",
      },
    })

    try {
      const payload = parseStoredReportPayload(report.payloadJson)

      if (!payload) {
        throw new Error("Payload do relatorio esta invalido")
      }

      if (!report.client.whatsappGroupId) {
        throw new Error("Cliente sem grupo de WhatsApp configurado")
      }

      const message = buildWhatsAppReportMessage({
        reportId: report.id,
        payload,
      })

      const delivery = await sendWhatsAppText({
        number: report.client.whatsappGroupId,
        text: message,
      })

      await prisma.$transaction([
        prisma.sendLog.update({
          where: { id: sendLog.id },
          data: {
            status: "OK",
            sentAt: new Date(),
            errorMessage: null,
          },
        }),
        prisma.report.update({
          where: { id: report.id },
          data: {
            status: "SENT",
          },
        }),
      ])

      return NextResponse.json({
        ok: true,
        reportId: report.id,
        sendLogId: sendLog.id,
        status: "SENT",
        deliveryStatus:
          "status" in delivery && typeof delivery.status === "string"
            ? delivery.status
            : null,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao enviar relatorio"

      logError("reports.send.post", error, {
        reportId: report.id,
        sendLogId: sendLog.id,
      })

      await prisma.$transaction([
        prisma.sendLog.update({
          where: { id: sendLog.id },
          data: {
            status: "FAILED",
            errorMessage: message,
          },
        }),
        prisma.report.update({
          where: { id: report.id },
          data: {
            status: "FAILED",
          },
        }),
      ])

      return NextResponse.json({ error: message }, { status: 400 })
    }
  } catch (error) {
    logError("reports.send.unhandled", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
