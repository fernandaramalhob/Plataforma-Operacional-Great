import { after, NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { processPendingReportBatch } from "@/lib/report-processing"
import {
  processDueReportSchedules,
  serializeReportSchedule,
  upsertClientReportSchedule,
} from "@/lib/report-schedule"
import { logError } from "@/lib/safe-logger"
import {
  getReportScheduleValidationMessage,
  reportSchedulePayloadSchema,
} from "@/lib/validations/report-schedule.schema"
import { z } from "zod"

const bulkSchedulePayloadSchema = z.object({
  clientIds: z.array(z.string().trim().min(1)).min(1),
  payload: reportSchedulePayloadSchema,
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const parsedBody = bulkSchedulePayloadSchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: getReportScheduleValidationMessage(parsedBody.error) },
        { status: 400 }
      )
    }

    const uniqueClientIds = [...new Set(parsedBody.data.clientIds)]
    const clients = await prisma.client.findMany({
      where: {
        id: {
          in: uniqueClientIds,
        },
      },
      select: {
        id: true,
        managerId: true,
      },
    })

    if (clients.length !== uniqueClientIds.length) {
      return NextResponse.json(
        { error: "Um ou mais clientes selecionados não foram encontrados." },
        { status: 404 }
      )
    }

    const unauthorizedClient = clients.find(
      (client) => !canAccessClient(user, client.managerId)
    )

    if (unauthorizedClient) {
      return NextResponse.json(
        { error: "Você não tem acesso a um ou mais clientes selecionados." },
        { status: 403 }
      )
    }

    const schedules = []

    for (const clientId of uniqueClientIds) {
      const schedule = await upsertClientReportSchedule({
        clientId,
        createdByUserId: user.id,
        payload: parsedBody.data.payload,
      })

      schedules.push(serializeReportSchedule(schedule))
    }

    after(async () => {
      await processDueReportSchedules({ limit: 25 }).catch((error) => {
        logError("reports.schedules.bulk.process-due", error, {
          clientCount: uniqueClientIds.length,
        })
      })

      await processPendingReportBatch(10).catch((error) => {
        logError("reports.schedules.bulk.process-pending", error, {
          clientCount: uniqueClientIds.length,
        })
      })
    })

    return NextResponse.json({
      ok: true,
      clientCount: uniqueClientIds.length,
      schedules,
    })
  } catch (error) {
    logError("reports.schedules.bulk.post", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
