import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import {
  ensureReportScheduleLoopStarted,
  triggerReportScheduleCycle,
} from "@/lib/report-schedule-runner"
import {
  disableClientReportSchedule,
  serializeReportSchedule,
  upsertClientReportSchedule,
} from "@/lib/report-schedule"
import { logError } from "@/lib/safe-logger"
import {
  getReportScheduleValidationMessage,
  reportSchedulePayloadSchema,
} from "@/lib/validations/report-schedule.schema"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureReportScheduleLoopStarted()

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        managerId: true,
        reportSchedule: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nÃ£o encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    return NextResponse.json({
      schedule: client.reportSchedule
        ? serializeReportSchedule(client.reportSchedule)
        : null,
    })
  } catch (error) {
    logError("client.report-schedule.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureReportScheduleLoopStarted()

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        managerId: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nÃ£o encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    const body = await request.json()
    const parsedPayload = reportSchedulePayloadSchema.safeParse(body)

    if (!parsedPayload.success) {
      return NextResponse.json(
        { error: getReportScheduleValidationMessage(parsedPayload.error) },
        { status: 400 }
      )
    }

    const schedule = await upsertClientReportSchedule({
      clientId: id,
      createdByUserId: user.id,
      payload: parsedPayload.data,
    })

    triggerReportScheduleCycle()

    return NextResponse.json({
      ok: true,
      schedule: serializeReportSchedule(schedule),
    })
  } catch (error) {
    logError("client.report-schedule.put", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureReportScheduleLoopStarted()

    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "NÃ£o autorizado" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
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

    if (!client) {
      return NextResponse.json({ error: "Cliente nÃ£o encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    if (!client.reportSchedule) {
      return NextResponse.json({ schedule: null })
    }

    const schedule = await disableClientReportSchedule(id)

    return NextResponse.json({
      ok: true,
      schedule: serializeReportSchedule(schedule),
    })
  } catch (error) {
    logError("client.report-schedule.delete", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
