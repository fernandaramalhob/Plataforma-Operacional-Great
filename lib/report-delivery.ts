import { buildReportPdfBuffer } from "@/lib/report-pdf-server"
import { buildReportPdfFileName } from "@/lib/report-pdf-shared"
import {
  buildWhatsAppReportMessage,
} from "@/lib/report-message"
import { parseStoredReportPayload } from "@/lib/report-domain"
import {
  sendWhatsAppDocument,
  sendWhatsAppText,
} from "@/lib/evolution-api"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import type { ReportSendMode } from "@/types/report.types"

type SendPersistedReportOptions = {
  mode?: ReportSendMode
  message?: string | null
  pdfBase64?: string | null
  pdfFileName?: string | null
}

function resolveReportMessage(params: {
  reportId: string
  payload: NonNullable<ReturnType<typeof parseStoredReportPayload>>
  message?: string | null
}) {
  const customMessage = params.message?.trim()

  if (customMessage) {
    return customMessage
  }

  return buildWhatsAppReportMessage({
    reportId: params.reportId,
    payload: params.payload,
  })
}

export async function sendPersistedReportNow(
  reportId: string,
  options?: SendPersistedReportOptions
) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
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
    throw new Error("Relatorio nao encontrado para envio")
  }

  const payload = parseStoredReportPayload(report.payloadJson)

  if (!payload) {
    throw new Error("Relatorio ainda nao foi gerado")
  }

  if (!report.client.whatsappGroupId) {
    throw new Error("Cliente sem grupo de WhatsApp configurado")
  }

  const mode = options?.mode ?? "PDF_AND_MESSAGE"
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
    const message = resolveReportMessage({
      reportId: report.id,
      payload,
      message: options?.message,
    })

    if (mode === "PDF_AND_MESSAGE" || mode === "PDF_ONLY") {
      const pdfBuffer = options?.pdfBase64
        ? Buffer.from(options.pdfBase64, "base64")
        : buildReportPdfBuffer({
            reportId: report.id,
            payload,
          })
      const fileName =
        options?.pdfFileName?.trim() ||
        `${buildReportPdfFileName({
          clientName: payload.client.name,
          startDate: payload.filters.since,
          endDate: payload.filters.until,
        })}.pdf`

      await sendWhatsAppDocument({
        number: report.client.whatsappGroupId,
        fileName,
        contentBase64: pdfBuffer.toString("base64"),
      })
    }

    if (mode === "PDF_AND_MESSAGE" || mode === "MESSAGE_ONLY") {
      await sendWhatsAppText({
        number: report.client.whatsappGroupId,
        text: message,
      })
    }

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

    return {
      reportId: report.id,
      status: "SENT" as const,
      mode,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar relatorio"

    logError("report-delivery.send-now", error, {
      reportId: report.id,
      sendLogId: sendLog.id,
      clientId: report.client.id,
      mode,
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

    throw error
  }
}
