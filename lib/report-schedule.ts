import type {
  Prisma,
  ReportSchedule,
} from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { queueReportGeneration } from "@/lib/report-service"
import { logError } from "@/lib/safe-logger"
import type {
  ReportSchedulePayload,
  ReportScheduleResponse,
  ReportSendMode,
} from "@/types/report.types"

export const REPORT_SCHEDULE_TIMEZONE = "America/Recife"
const REPORT_SCHEDULE_OFFSET = "-03:00"

function getReportScheduleTimeZone() {
  return (
    process.env.REPORT_SCHEDULE_TIMEZONE?.trim()
    || process.env.REPORT_TIMEZONE?.trim()
    || process.env.REPORT_AUTOMATION_TIMEZONE?.trim()
    || REPORT_SCHEDULE_TIMEZONE
  )
}

export const REPORT_SCHEDULE_WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "TerÃ§a-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "SÃ¡bado" },
] as const

export function formatScheduleTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function formatSaoPauloDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: getReportScheduleTimeZone(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

function getSaoPauloWeekday(date: Date) {
  const label = new Intl.DateTimeFormat("en-US", {
    timeZone: getReportScheduleTimeZone(),
    weekday: "short",
  })
    .format(date)
    .toUpperCase()

  return ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].indexOf(label)
}

function buildSaoPauloDateTime(date: string, hour: number, minute: number) {
  const candidate = new Date(
    `${date}T${formatScheduleTime(hour, minute)}:00${REPORT_SCHEDULE_OFFSET}`
  )

  if (Number.isNaN(candidate.getTime())) {
    throw new Error("NÃ£o foi possÃ­vel interpretar a data do agendamento.")
  }

  return candidate
}

export function buildNextWeeklyRunAt(params: {
  weekday: number
  hour: number
  minute: number
  from?: Date
}) {
  const from = params.from ?? new Date()

  for (let offset = 0; offset <= 7; offset += 1) {
    const candidateBase = new Date(from.getTime() + offset * 24 * 60 * 60 * 1000)
    const candidateDate = formatSaoPauloDate(candidateBase)
    const candidate = buildSaoPauloDateTime(
      candidateDate,
      params.hour,
      params.minute
    )

    if (getSaoPauloWeekday(candidate) !== params.weekday) {
      continue
    }

    if (candidate.getTime() > from.getTime()) {
      return candidate
    }
  }

  throw new Error("NÃ£o foi possÃ­vel calcular a prÃ³xima execuÃ§Ã£o semanal.")
}

export function buildScheduleNextRunAt(payload: ReportSchedulePayload, now = new Date()) {
  if (payload.frequency === "ONCE") {
    if (!payload.scheduledDate) {
      throw new Error("Selecione a data da execuÃ§Ã£o.")
    }

    return buildSaoPauloDateTime(payload.scheduledDate, payload.hour, payload.minute)
  }

  if (payload.weekday == null) {
    throw new Error("Selecione o dia da semana.")
  }

  return buildNextWeeklyRunAt({
    weekday: payload.weekday,
    hour: payload.hour,
    minute: payload.minute,
    from: now,
  })
}

export function serializeReportSchedule(
  schedule: Pick<
    ReportSchedule,
    | "id"
    | "clientId"
    | "frequency"
    | "weekday"
    | "scheduledDate"
    | "hour"
    | "minute"
    | "timeZone"
    | "filtersSince"
    | "filtersUntil"
    | "objective"
    | "sendMode"
    | "message"
    | "groupId"
    | "active"
    | "nextRunAt"
    | "lastRunAt"
    | "lastError"
    | "createdAt"
    | "updatedAt"
  >
): ReportScheduleResponse {
  return {
    id: schedule.id,
    clientId: schedule.clientId,
    frequency: schedule.frequency,
    weekday: schedule.weekday,
    scheduledDate: schedule.scheduledDate
      ? schedule.scheduledDate.toISOString().slice(0, 10)
      : null,
    hour: schedule.hour,
    minute: schedule.minute,
    timeZone: schedule.timeZone,
    filtersSince: schedule.filtersSince,
    filtersUntil: schedule.filtersUntil,
    objective: schedule.objective,
    sendMode: schedule.sendMode as ReportSendMode,
    message: schedule.message,
    groupId: schedule.groupId,
    active: schedule.active,
    nextRunAt: schedule.nextRunAt.toISOString(),
    lastRunAt: schedule.lastRunAt?.toISOString() ?? null,
    lastError: schedule.lastError,
    createdAt: schedule.createdAt.toISOString(),
    updatedAt: schedule.updatedAt.toISOString(),
  }
}

export async function upsertClientReportSchedule(params: {
  clientId: string
  createdByUserId: string
  payload: ReportSchedulePayload
}) {
  const nextRunAt = buildScheduleNextRunAt(params.payload)

  return prisma.reportSchedule.upsert({
    where: {
      clientId: params.clientId,
    },
    create: {
      clientId: params.clientId,
      createdByUserId: params.createdByUserId,
      frequency: params.payload.frequency,
      weekday: params.payload.frequency === "WEEKLY" ? params.payload.weekday : null,
      scheduledDate:
        params.payload.frequency === "ONCE" && params.payload.scheduledDate
          ? new Date(`${params.payload.scheduledDate}T00:00:00${REPORT_SCHEDULE_OFFSET}`)
          : null,
      hour: params.payload.hour,
      minute: params.payload.minute,
      timeZone: getReportScheduleTimeZone(),
      filtersSince: params.payload.filtersSince,
      filtersUntil: params.payload.filtersUntil,
      objective: params.payload.objective,
      sendMode: params.payload.sendMode,
      message: params.payload.message?.trim() || null,
      groupId: params.payload.groupId?.trim() || null,
      active: params.payload.active ?? true,
      nextRunAt,
      lastRunAt: null,
      lastError: null,
    },
    update: {
      createdByUserId: params.createdByUserId,
      frequency: params.payload.frequency,
      weekday: params.payload.frequency === "WEEKLY" ? params.payload.weekday : null,
      scheduledDate:
        params.payload.frequency === "ONCE" && params.payload.scheduledDate
          ? new Date(`${params.payload.scheduledDate}T00:00:00${REPORT_SCHEDULE_OFFSET}`)
          : null,
      hour: params.payload.hour,
      minute: params.payload.minute,
      timeZone: getReportScheduleTimeZone(),
      filtersSince: params.payload.filtersSince,
      filtersUntil: params.payload.filtersUntil,
      objective: params.payload.objective,
      sendMode: params.payload.sendMode,
      message: params.payload.message?.trim() || null,
      groupId: params.payload.groupId?.trim() || null,
      active: params.payload.active ?? true,
      nextRunAt,
      lastError: null,
    },
  })
}

export async function disableClientReportSchedule(clientId: string) {
  return prisma.reportSchedule.update({
    where: {
      clientId,
    },
    data: {
      active: false,
    },
  })
}

type DueSchedule = Prisma.ReportScheduleGetPayload<{
  include: {
    client: {
      include: {
        manager: {
          select: {
            id: true
            metaAccessToken: true
            metaTokenExpiresAt: true
          }
        }
      }
    }
    createdByUser: {
      select: {
        id: true
        email: true
        role: true
        metaAccessToken: true
        metaTokenExpiresAt: true
      }
    }
  }
}>

async function executeReportSchedule(schedule: DueSchedule) {
  await queueReportGeneration({
    clientId: schedule.clientId,
    requestedByUserId: schedule.createdByUser.id,
    source: "schedule",
    filters: {
      since: schedule.filtersSince,
      until: schedule.filtersUntil,
      objective: schedule.objective,
    },
    enqueueSendOnComplete: true,
    sendOptions: {
      mode: schedule.sendMode as ReportSendMode,
      message: schedule.message,
      groupId: schedule.groupId || schedule.client.whatsappGroupId,
    },
  })
}

async function claimDueSchedule(schedule: DueSchedule, retryMinutes: number) {
  const provisionalNextRunAt = new Date(Date.now() + retryMinutes * 60_000)
  const updateResult = await prisma.reportSchedule.updateMany({
    where: {
      id: schedule.id,
      active: true,
      nextRunAt: schedule.nextRunAt,
    },
    data: {
      nextRunAt: provisionalNextRunAt,
    },
  })

  return updateResult.count > 0
}

export async function processDueReportSchedules(params?: {
  retryMinutes?: number
  dryRun?: boolean
  limit?: number
}) {
  const retryMinutes = params?.retryMinutes ?? 15
  const dryRun = params?.dryRun ?? false
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      active: true,
      nextRunAt: {
        lte: new Date(),
      },
    },
    orderBy: {
      nextRunAt: "asc",
    },
    ...(params?.limit
      ? {
          take: params.limit,
        }
      : {}),
    include: {
      client: {
        include: {
          manager: {
            select: {
              id: true,
              metaAccessToken: true,
              metaTokenExpiresAt: true,
            },
          },
        },
      },
      createdByUser: {
        select: {
          id: true,
          email: true,
          role: true,
          metaAccessToken: true,
          metaTokenExpiresAt: true,
        },
      },
    },
  })

  for (const schedule of dueSchedules) {
    if (dryRun) {
      continue
    }

    const claimed = await claimDueSchedule(schedule, retryMinutes)

    if (!claimed) {
      continue
    }

    try {
      await executeReportSchedule(schedule)

      await prisma.reportSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          lastRunAt: new Date(),
          lastError: null,
          active: schedule.frequency === "WEEKLY",
          nextRunAt:
            schedule.frequency === "WEEKLY" && schedule.weekday != null
              ? buildNextWeeklyRunAt({
                  weekday: schedule.weekday,
                  hour: schedule.hour,
                  minute: schedule.minute,
                  from: new Date(Date.now() + 60_000),
                })
              : new Date(Date.now() + retryMinutes * 60_000),
        },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao executar agendamento"

      logError("report-schedule.process", error, {
        scheduleId: schedule.id,
        clientId: schedule.clientId,
      })

      await prisma.reportSchedule.update({
        where: {
          id: schedule.id,
        },
        data: {
          lastError: message,
          nextRunAt: new Date(Date.now() + retryMinutes * 60_000),
        },
      })
    }
  }

  return dueSchedules.length
}
