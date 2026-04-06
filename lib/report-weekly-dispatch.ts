import { prisma } from "@/lib/prisma"
import {
  buildAutomationReferenceWeekDate,
  loadReportAutomationSettings,
  REPORT_AUTOMATION_DEFAULT_TIMEZONE,
} from "@/lib/report-automation"
import { getRedisConnection, isRedisConfigured } from "@/lib/redis"
import { buildLastCompletedWeekRange, queueReportGeneration } from "@/lib/report-service"
import { recordReportAlert } from "@/lib/report-monitoring"
import { logError } from "@/lib/safe-logger"

type WeeklySchedule = {
  minute: number
  hour: number
  weekday: number
  raw: string
}

const WEEKDAY_LABEL_TO_NUMBER: Record<string, number> = {
  SUN: 0,
  MON: 1,
  TUE: 2,
  WED: 3,
  THU: 4,
  FRI: 5,
  SAT: 6,
}

function parseCronNumber(rawValue: string, minimum: number, maximum: number) {
  const value = Number.parseInt(rawValue, 10)

  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new Error(
      `Campo cron invalido '${rawValue}'. Esperado numero entre ${minimum} e ${maximum}.`
    )
  }

  return value
}

function parseWeeklySchedule(rawCron: string | undefined): WeeklySchedule {
  const cron = rawCron?.trim() || "0 9 * * 4"
  const [minuteRaw, hourRaw, dayOfMonth, month, weekdayRaw] = cron.split(/\s+/)

  if (!minuteRaw || !hourRaw || !dayOfMonth || !month || !weekdayRaw) {
    throw new Error(`REPORT_WEEKLY_CRON precisa ter 5 campos. Valor atual: '${cron}'.`)
  }

  if (dayOfMonth !== "*" || month !== "*") {
    throw new Error(
      "A automacao semanal no Vercel suporta apenas cron no formato 'MIN HOUR * * WEEKDAY'."
    )
  }

  const minute = parseCronNumber(minuteRaw, 0, 59)
  const hour = parseCronNumber(hourRaw, 0, 23)
  const weekdayLabel = weekdayRaw.toUpperCase()
  const weekday = Number.isFinite(Number(weekdayLabel))
    ? parseCronNumber(weekdayLabel, 0, 7) % 7
    : WEEKDAY_LABEL_TO_NUMBER[weekdayLabel]

  if (weekday === undefined) {
    throw new Error(`Dia da semana invalido em REPORT_WEEKLY_CRON: '${weekdayRaw}'.`)
  }

  return {
    minute,
    hour,
    weekday,
    raw: cron,
  }
}

function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  })

  const entries = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  ) as Record<string, string>

  return {
    weekday:
      WEEKDAY_LABEL_TO_NUMBER[entries.weekday?.toUpperCase() ?? ""] ?? -1,
    hour: Number.parseInt(entries.hour ?? "0", 10),
    minute: Number.parseInt(entries.minute ?? "0", 10),
    dateKey: `${entries.year}-${entries.month}-${entries.day}`,
  }
}

function isWeeklyDispatchDue(now: Date, timeZone: string, schedule: WeeklySchedule) {
  const zoned = getZonedParts(now, timeZone)

  return (
    zoned.weekday === schedule.weekday &&
    zoned.hour === schedule.hour &&
    zoned.minute === schedule.minute
  )
}

async function resolveWeeklyRequestedByUserId(clientManagerId: string | null) {
  if (clientManagerId) {
    return clientManagerId
  }

  const admin = await prisma.user.findFirst({
    where: {
      role: "ADMIN",
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
    },
  })

  if (!admin) {
    throw new Error("Nenhum administrador disponivel para executar o job semanal")
  }

  return admin.id
}

async function acquireWeeklyDispatchLock(lockKey: string) {
  if (!isRedisConfigured()) {
    return true
  }

  const redis = getRedisConnection("client")
  const result = await redis.set(lockKey, "1", "EX", 8 * 24 * 60 * 60, "NX")
  return result === "OK"
}

export async function maybeDispatchWeeklyReports(params?: { now?: Date }) {
  const now = params?.now ?? new Date()
  const timeZone =
    process.env.REPORT_WEEKLY_TZ?.trim() || REPORT_AUTOMATION_DEFAULT_TIMEZONE
  const schedule = parseWeeklySchedule(process.env.REPORT_WEEKLY_CRON)

  if (!isWeeklyDispatchDue(now, timeZone, schedule)) {
    return {
      due: false,
      queuedReports: 0,
      failedClients: 0,
      skippedClients: 0,
      totalClients: 0,
      timeZone,
      schedule: schedule.raw,
    }
  }

  const zoned = getZonedParts(now, timeZone)
  const lockKey = `greatgo:weekly-dispatch:${zoned.dateKey}:${schedule.raw}`
  const acquired = await acquireWeeklyDispatchLock(lockKey)

  if (!acquired) {
    return {
      due: true,
      skippedBecauseLocked: true,
      queuedReports: 0,
      failedClients: 0,
      skippedClients: 0,
      totalClients: 0,
      timeZone,
      schedule: schedule.raw,
    }
  }

  const batchSize = Number.parseInt(process.env.REPORT_WEEKLY_BATCH_SIZE ?? "", 10)
  const take = Number.isFinite(batchSize) && batchSize > 0 ? batchSize : 10
  const automationSettings = loadReportAutomationSettings()
  const objective =
    process.env.REPORT_WEEKLY_OBJECTIVE?.trim() || automationSettings.objective
  const { since, until } = buildLastCompletedWeekRange(now)
  const referenceWeekDate = buildAutomationReferenceWeekDate({ since, until })

  let cursor: string | undefined
  let totalClients = 0
  let queuedReports = 0
  let failedClients = 0
  let skippedClients = 0

  while (true) {
    const clients = await prisma.client.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        id: "asc",
      },
      take,
      ...(cursor
        ? {
            cursor: { id: cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        name: true,
        adAccountId: true,
        whatsappGroupId: true,
        managerId: true,
      },
    })

    if (clients.length === 0) {
      break
    }

    totalClients += clients.length

    for (const client of clients) {
      try {
        if (!String(client.adAccountId ?? "").trim()) {
          throw new Error("Cliente ativo sem conta META conectada")
        }

        if (
          !automationSettings.groupId &&
          !String(client.whatsappGroupId ?? "").trim()
        ) {
          throw new Error("Cliente ativo sem grupo de WhatsApp configurado")
        }

        if (automationSettings.skipIfAlreadySent) {
          const existingReport = await prisma.report.findFirst({
            where: {
              clientId: client.id,
              status: "SENT",
              referenceWeek: referenceWeekDate,
            },
            select: {
              id: true,
            },
          })

          if (existingReport) {
            skippedClients += 1
            continue
          }
        }

        const requestedByUserId = await resolveWeeklyRequestedByUserId(client.managerId)
        await queueReportGeneration({
          clientId: client.id,
          requestedByUserId,
          source: "weekly",
          filters: {
            since,
            until,
            objective,
          },
          enqueueSendOnComplete: true,
          sendOptions: {
            mode: automationSettings.sendMode,
            groupId: automationSettings.groupId || client.whatsappGroupId,
          },
        })

        queuedReports += 1
      } catch (error) {
        failedClients += 1

        await recordReportAlert({
          severity: "warning",
          source: "weekly-dispatch",
          queueName: "report-weekly",
          message: "Falha ao enfileirar um cliente ativo no disparo semanal.",
          jobId: client.id,
          jobName: "weekly-dispatch",
          details: {
            clientId: client.id,
            clientName: client.name,
            errorMessage:
              error instanceof Error ? error.message : "Erro inesperado",
          },
        }).catch((alertError) => {
          logError("report-weekly-dispatch.alert", alertError, {
            clientId: client.id,
          })
        })
      }
    }

    cursor = clients[clients.length - 1]?.id
  }

  return {
    due: true,
    skippedBecauseLocked: false,
    totalClients,
    queuedReports,
    failedClients,
    skippedClients,
    timeZone,
    schedule: schedule.raw,
    since,
    until,
    objective,
  }
}
