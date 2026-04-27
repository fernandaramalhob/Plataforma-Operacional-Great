import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import { z } from "zod"

const payloadSchema = z.object({
  clientIds: z.array(z.string().trim().min(1)).min(1),
  scheduledAt: z.string().datetime(),
})

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const parsed = payloadSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Informe os clientes e o horario validos" },
        { status: 400 }
      )
    }

    const scheduledAt = new Date(parsed.data.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Escolha um horario futuro para reagendar" },
        { status: 400 }
      )
    }

    const uniqueClientIds = [...new Set(parsed.data.clientIds)]
    const clients = await prisma.client.findMany({
      where: {
        id: {
          in: uniqueClientIds,
        },
      },
      select: {
        id: true,
        managerId: true,
        reportSchedule: {
          select: {
            id: true,
          },
        },
      },
    })

    if (clients.length !== uniqueClientIds.length) {
      return NextResponse.json(
        { error: "Um ou mais clientes não foram encontrados" },
        { status: 404 }
      )
    }

    const unauthorizedClient = clients.find(
      (client) => !canAccessClient(user, client.managerId)
    )

    if (unauthorizedClient) {
      return NextResponse.json(
        { error: "Você não tem acesso a um ou mais clientes selecionados" },
        { status: 403 }
      )
    }

    const schedulableClientIds = clients
      .filter((client) => client.reportSchedule)
      .map((client) => client.id)

    const updated = await prisma.reportSchedule.updateMany({
      where: {
        clientId: {
          in: schedulableClientIds,
        },
      },
      data: {
        nextRunAt: scheduledAt,
        active: true,
        lastError: null,
      },
    })

    return NextResponse.json({
      ok: true,
      succeeded: updated.count,
      failed: uniqueClientIds.length - updated.count,
      scheduledAt: scheduledAt.toISOString(),
    })
  } catch (error) {
    logError("reports.schedules.reschedule.post", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
