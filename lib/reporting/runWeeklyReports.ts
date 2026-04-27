import { Prisma } from "@prisma/client"
import { ensureAdminUser } from "@/lib/admin-user"
import {
  buildAutomationReferenceWeekDate,
  loadReportAutomationSettings,
  maskAutomationGroupId,
} from "@/lib/report-automation"
import { prisma } from "@/lib/prisma"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import { generateLiveReportPayload, persistGeneratedReport } from "@/lib/report-service"
import { logError } from "@/lib/safe-logger"
import {
  buildWeeklyReportWeekKey,
  resolveWeeklyReportTimeZone,
  resolveWeeklyReportWindow,
} from "@/lib/reporting/weekly-report-time"

type EligibleClient = {
  id: string
  name: string
  company: string | null
  adAccountId: string | null
  whatsappGroupId: string | null
  managerId: string | null
  manager: {
    id: string
    metaAccessToken: string | null
    metaTokenExpiresAt: Date | null
  } | null
}

type TechnicalUser = {
  id: string
  email: string
  role: "ADMIN" | "MANAGER"
  metaAccessToken: string | null
  metaTokenExpiresAt: Date | null
}

type WeeklyReportsTrigger = "cron" | "manual" | "continuation"

export type WeeklyReportsRunParams = {
  now?: Date
  cursor?: string | null
  reportWeekKey?: string | null
  trigger?: WeeklyReportsTrigger
  batchSize?: number | null
  batchDelayMs?: number | null
  maxRuntimeMs?: number | null
  maxClients?: number | null
  dryRun?: boolean
}

export type WeeklyReportsSummary = {
  ok: boolean
  trigger: WeeklyReportsTrigger
  reportWeekKey: string
  timeZone: string
  window: {
    since: string
    until: string
  }
  batchSize: number
  batchDelayMs: number
  maxRuntimeMs: number
  totalEligibleClients: number
  processedClients: number
  successfulClients: number
  alreadySentClients: number
  inProgressClients: number
  failedClients: number
  skippedIneligibleClients: number
  totalBatches: number
  durationMs: number
  hasMore: boolean
  nextCursor: string | null
  stopReason: "COMPLETED" | "TIME_BUDGET" | "MAX_CLIENTS"
  dryRun: boolean
}

type DispatchClaimResult =
  | {
      type: "CLAIMED"
      dispatchId: string
      attemptCount: number
      processingToken: string
    }
  | {
      type: "ALREADY_SENT"
      dispatchId: string | null
    }
  | {
      type: "IN_PROGRESS"
      dispatchId: string | null
    }

const DEFAULT_BATCH_SIZE = 10
const DEFAULT_BATCH_DELAY_MS = 400
const DEFAULT_MAX_RUNTIME_MS = 240_000
const CONTINUATION_BUFFER_MS = 20_000

function readPositiveInt(
  value: string | undefined,
  fallbackValue: number,
  minimum = 1
) {
  const parsed = Number.parseInt(value ?? "", 10)

  if (!Number.isFinite(parsed) || parsed < minimum) {
    return fallbackValue
  }

  return parsed
}

function resolveBatchSize(value?: number | null) {
  if (value && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  return readPositiveInt(process.env.BATCH_SIZE, DEFAULT_BATCH_SIZE)
}

function resolveBatchDelayMs(value?: number | null) {
  if (value != null && Number.isFinite(value) && value >= 0) {
    return Math.trunc(value)
  }

  return readPositiveInt(process.env.BATCH_DELAY_MS, DEFAULT_BATCH_DELAY_MS, 0)
}

function resolveMaxRuntimeMs(value?: number | null) {
  if (value && Number.isFinite(value) && value > 0) {
    return Math.trunc(value)
  }

  return (
    readPositiveInt(
      process.env.REPORT_MAX_RUNTIME_SECONDS,
      Math.trunc(DEFAULT_MAX_RUNTIME_MS / 1_000)
    ) * 1_000
  )
}

function resolveProcessingStaleMs() {
  return (
    readPositiveInt(process.env.REPORT_PROCESSING_STALE_MINUTES, 30) * 60_000
  )
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function isClaimedDispatch(
  dispatch: DispatchClaimResult
): dispatch is Extract<DispatchClaimResult, { type: "CLAIMED" }> {
  return dispatch.type === "CLAIMED"
}

function logInfo(event: string, payload: Record<string, unknown>) {
  console.info(`[weekly-reports] ${event}`, payload)
}

function logWarn(event: string, payload: Record<string, unknown>) {
  console.warn(`[weekly-reports] ${event}`, payload)
}

async function resolveTechnicalUser() {
  await ensureAdminUser()

  const settings = loadReportAutomationSettings()
  const automationEmail = settings.automationEmail

  if (automationEmail) {
    const configuredUser = await prisma.user.findUnique({
      where: {
        email: automationEmail,
      },
      select: {
        id: true,
        email: true,
        role: true,
        metaAccessToken: true,
        metaTokenExpiresAt: true,
      },
    })

    if (!configuredUser) {
      throw new Error(
        `Usuário tecnico '${automationEmail}' não foi encontrado para o envio semanal.`
      )
    }

    if (configuredUser.role !== "ADMIN") {
      throw new Error(
        `Usuário tecnico '${automationEmail}' precisa ter papel ADMIN.`
      )
    }

    return configuredUser satisfies TechnicalUser
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
      email: true,
      role: true,
      metaAccessToken: true,
      metaTokenExpiresAt: true,
    },
  })

  if (!admin) {
    throw new Error("Nenhum usuário ADMIN disponível para o envio semanal.")
  }

  return admin satisfies TechnicalUser
}

async function countEligibleClients(globalGroupId: string | null) {
  return prisma.client.count({
    where: {
      status: "ACTIVE",
      adAccountId: {
        not: null,
      },
      ...(globalGroupId
        ? {}
        : {
            whatsappGroupId: {
              not: null,
            },
          }),
    },
  })
}

async function loadEligibleClientBatch(params: {
  cursor?: string | null
  take: number
  globalGroupId: string | null
}) {
  return prisma.client.findMany({
    where: {
      status: "ACTIVE",
      adAccountId: {
        not: null,
      },
      ...(params.globalGroupId
        ? {}
        : {
            whatsappGroupId: {
              not: null,
            },
          }),
    },
    orderBy: {
      id: "asc",
    },
    take: params.take,
    ...(params.cursor
      ? {
          cursor: {
            id: params.cursor,
          },
          skip: 1,
        }
      : {}),
    select: {
      id: true,
      name: true,
      company: true,
      adAccountId: true,
      whatsappGroupId: true,
      managerId: true,
      manager: {
        select: {
          id: true,
          metaAccessToken: true,
          metaTokenExpiresAt: true,
        },
      },
    },
  }) satisfies Promise<EligibleClient[]>
}

async function findSentReportForWeek(clientId: string, referenceWeek: Date) {
  return prisma.report.findFirst({
    where: {
      clientId,
      status: "SENT",
      referenceWeek,
    },
    orderBy: {
      generatedAt: "desc",
    },
    select: {
      id: true,
      generatedAt: true,
      sendLogs: {
        where: {
          status: "OK",
        },
        orderBy: {
          sentAt: "desc",
        },
        take: 1,
        select: {
          sentAt: true,
        },
      },
    },
  })
}

async function markDispatchAsSent(params: {
  dispatchId: string
  processingToken?: string
  reportId: string
  sentAt: Date
}) {
  const updateResult = await prisma.weeklyReportDispatch.updateMany({
    where: {
      id: params.dispatchId,
      ...(params.processingToken
        ? {
            processingToken: params.processingToken,
          }
        : {}),
    },
    data: {
      reportId: params.reportId,
      status: "SENT",
      sentAt: params.sentAt,
      errorMessage: null,
      processingToken: null,
      processingStartedAt: null,
    },
  })

  if (updateResult.count === 0) {
    throw new Error("Não foi possível confirmar o envio semanal no controle.")
  }
}

async function markDispatchAsFailed(params: {
  dispatchId: string
  processingToken: string
  errorMessage: string
}) {
  await prisma.weeklyReportDispatch.updateMany({
    where: {
      id: params.dispatchId,
      processingToken: params.processingToken,
    },
    data: {
      status: "FAILED",
      errorMessage: params.errorMessage,
      processingToken: null,
      processingStartedAt: null,
    },
  })
}

async function claimWeeklyDispatch(params: {
  clientId: string
  reportWeekKey: string
  filtersSince: string
  filtersUntil: string
  timeZone: string
  staleBefore: Date
}) {
  const now = new Date()
  const processingToken = crypto.randomUUID()

  try {
    const created = await prisma.weeklyReportDispatch.create({
      data: {
        clientId: params.clientId,
        reportWeekKey: params.reportWeekKey,
        filtersSince: params.filtersSince,
        filtersUntil: params.filtersUntil,
        timeZone: params.timeZone,
        status: "PROCESSING",
        attemptCount: 1,
        lastAttemptAt: now,
        processingToken,
        processingStartedAt: now,
      },
      select: {
        id: true,
        attemptCount: true,
      },
    })

    return {
      type: "CLAIMED",
      dispatchId: created.id,
      attemptCount: created.attemptCount,
      processingToken,
    } satisfies DispatchClaimResult
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError)
      || error.code !== "P2002"
    ) {
      throw error
    }
  }

  const existing = await prisma.weeklyReportDispatch.findUnique({
    where: {
      clientId_reportWeekKey: {
        clientId: params.clientId,
        reportWeekKey: params.reportWeekKey,
      },
    },
    select: {
      id: true,
      status: true,
      attemptCount: true,
      processingStartedAt: true,
    },
  })

  if (!existing) {
    throw new Error("Controle semanal não encontrado apos o conflito de chave unica.")
  }

  if (existing.status === "SENT") {
    return {
      type: "ALREADY_SENT",
      dispatchId: existing.id,
    } satisfies DispatchClaimResult
  }

  if (
    existing.status === "PROCESSING"
    && existing.processingStartedAt
    && existing.processingStartedAt >= params.staleBefore
  ) {
    return {
      type: "IN_PROGRESS",
      dispatchId: existing.id,
    } satisfies DispatchClaimResult
  }

  const nextAttemptCount = existing.attemptCount + 1
  const updateResult = await prisma.weeklyReportDispatch.updateMany({
    where: {
      id: existing.id,
      OR: [
        {
          status: {
            in: ["FAILED", "SKIPPED"],
          },
        },
        {
          status: "PROCESSING",
          processingStartedAt: {
            lt: params.staleBefore,
          },
        },
      ],
    },
    data: {
      status: "PROCESSING",
      filtersSince: params.filtersSince,
      filtersUntil: params.filtersUntil,
      timeZone: params.timeZone,
      attemptCount: nextAttemptCount,
      lastAttemptAt: now,
      errorMessage: null,
      processingToken,
      processingStartedAt: now,
      sentAt: null,
    },
  })

  if (updateResult.count === 0) {
    const current = await prisma.weeklyReportDispatch.findUnique({
      where: {
        id: existing.id,
      },
      select: {
        status: true,
      },
    })

    return {
      type: current?.status === "SENT" ? "ALREADY_SENT" : "IN_PROGRESS",
      dispatchId: existing.id,
    } satisfies DispatchClaimResult
  }

  return {
    type: "CLAIMED",
    dispatchId: existing.id,
    attemptCount: nextAttemptCount,
    processingToken,
  } satisfies DispatchClaimResult
}

async function processSingleClient(params: {
  client: EligibleClient
  technicalUser: TechnicalUser
  reportWeekKey: string
  referenceWeek: Date
  timeZone: string
  window: {
    since: string
    until: string
  }
  globalGroupId: string | null
  sendMode: "PDF_AND_MESSAGE" | "PDF_ONLY" | "MESSAGE_ONLY"
  objective: string
  staleBefore: Date
  dryRun: boolean
}) {
  const effectiveGroupId =
    params.globalGroupId || String(params.client.whatsappGroupId ?? "").trim() || null

  if (!String(params.client.adAccountId ?? "").trim() || !effectiveGroupId) {
    return {
      outcome: "SKIPPED_INELIGIBLE" as const,
    }
  }

  if (params.dryRun) {
    const existing = await prisma.weeklyReportDispatch.findUnique({
      where: {
        clientId_reportWeekKey: {
          clientId: params.client.id,
          reportWeekKey: params.reportWeekKey,
        },
      },
      select: {
        status: true,
      },
    })

    const previousSentReport = await findSentReportForWeek(
      params.client.id,
      params.referenceWeek
    )

    if (existing?.status === "SENT" || previousSentReport) {
      return {
        outcome: "ALREADY_SENT" as const,
      }
    }

    return {
      outcome: "DRY_RUN_READY" as const,
    }
  }

  const dispatch = await claimWeeklyDispatch({
    clientId: params.client.id,
    reportWeekKey: params.reportWeekKey,
    filtersSince: params.window.since,
    filtersUntil: params.window.until,
    timeZone: params.timeZone,
    staleBefore: params.staleBefore,
  })

  if (!isClaimedDispatch(dispatch)) {
    return {
      outcome: dispatch.type === "ALREADY_SENT" ? "ALREADY_SENT" : "IN_PROGRESS",
    }
  }

  const alreadySentReport = await findSentReportForWeek(
    params.client.id,
    params.referenceWeek
  )

  if (alreadySentReport) {
    const sentAt = alreadySentReport.sendLogs[0]?.sentAt || alreadySentReport.generatedAt

    await markDispatchAsSent({
      dispatchId: dispatch.dispatchId,
      processingToken: dispatch.processingToken,
      reportId: alreadySentReport.id,
      sentAt,
    })

    return {
      outcome: "ALREADY_SENT" as const,
    }
  }

  const dispatchId = dispatch.dispatchId
  const processingToken = dispatch.processingToken

  try {
    const payload = await generateLiveReportPayload({
      user: params.technicalUser,
      client: params.client,
      filters: {
        since: params.window.since,
        until: params.window.until,
        objective: params.objective,
      },
    })

    const persistedReport = await persistGeneratedReport({
      clientId: params.client.id,
      payload,
      filters: {
        since: params.window.since,
        until: params.window.until,
        objective: params.objective,
      },
    })

    await sendPersistedReportNow(persistedReport.reportId, {
      mode: params.sendMode,
      groupId: effectiveGroupId,
      pdfStrategy: "standard",
    })

    await markDispatchAsSent({
      dispatchId,
      processingToken,
      reportId: persistedReport.reportId,
      sentAt: new Date(),
    })

    return {
      outcome: "SENT" as const,
      reportId: persistedReport.reportId,
      attemptCount: dispatch.attemptCount,
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Falha ao enviar relatório semanal."

    await markDispatchAsFailed({
      dispatchId,
      processingToken,
      errorMessage: message,
    }).catch((updateError) => {
      logError("weekly-reports.mark-failed", updateError, {
        clientId: params.client.id,
        dispatchId,
      })
    })

    throw error
  }
}

export async function runWeeklyReports(
  params: WeeklyReportsRunParams = {}
): Promise<WeeklyReportsSummary> {
  const startedAt = params.now ?? new Date()
  const settings = loadReportAutomationSettings()
  const trigger = params.trigger ?? "manual"
  const timeZone = resolveWeeklyReportTimeZone()
  const window = resolveWeeklyReportWindow({
    timeZone,
    referenceDate: startedAt,
  })
  const reportWeekKey = params.reportWeekKey?.trim() || buildWeeklyReportWeekKey(window)
  const batchSize = resolveBatchSize(params.batchSize)
  const batchDelayMs = resolveBatchDelayMs(params.batchDelayMs)
  const maxRuntimeMs = resolveMaxRuntimeMs(params.maxRuntimeMs)
  const staleBefore = new Date(Date.now() - resolveProcessingStaleMs())
  const totalEligibleClients = await countEligibleClients(settings.groupId)
  const referenceWeek = buildAutomationReferenceWeekDate(window)
  const technicalUser = await resolveTechnicalUser()

  logInfo("started", {
    trigger,
    reportWeekKey,
    timeZone,
    batchSize,
    batchDelayMs,
    maxRuntimeMs,
    cursor: params.cursor ?? null,
    totalEligibleClients,
    window,
  })

  let cursor = params.cursor?.trim() || null
  let processedClients = 0
  let successfulClients = 0
  let alreadySentClients = 0
  let inProgressClients = 0
  let failedClients = 0
  let skippedIneligibleClients = 0
  let totalBatches = 0
  let hasMore = false
  let stopReason: WeeklyReportsSummary["stopReason"] = "COMPLETED"

  while (true) {
    if (processedClients > 0 && Date.now() - startedAt.getTime() >= maxRuntimeMs - CONTINUATION_BUFFER_MS) {
      hasMore = true
      stopReason = "TIME_BUDGET"
      break
    }

    if (params.maxClients && processedClients >= params.maxClients) {
      hasMore = true
      stopReason = "MAX_CLIENTS"
      break
    }

    const remainingTake = params.maxClients
      ? Math.max(0, params.maxClients - processedClients)
      : batchSize
    const take = Math.min(batchSize, remainingTake || batchSize)
    const clients = await loadEligibleClientBatch({
      cursor,
      take,
      globalGroupId: settings.groupId,
    })

    if (clients.length === 0) {
      break
    }

    totalBatches += 1
    logInfo("batch_started", {
      batch: totalBatches,
      take: clients.length,
      firstClientId: clients[0]?.id ?? null,
      lastClientId: clients[clients.length - 1]?.id ?? null,
    })

    const results = await Promise.allSettled(
      clients.map(async (client) => {
        const maskedGroupId =
          maskAutomationGroupId(settings.groupId || client.whatsappGroupId) || null

        try {
          const result = await processSingleClient({
            client,
            technicalUser,
            reportWeekKey,
            referenceWeek,
            timeZone,
            window,
            globalGroupId: settings.groupId,
            sendMode: settings.sendMode,
            objective: settings.objective,
            staleBefore,
            dryRun: Boolean(params.dryRun),
          })

          if (result.outcome === "SENT") {
            logInfo("client_sent", {
              clientId: client.id,
              clientName: client.name,
              reportId: result.reportId,
              reportWeekKey,
              attemptCount: result.attemptCount,
              groupId: maskedGroupId,
            })
          } else if (result.outcome === "ALREADY_SENT") {
            logInfo("client_already_sent", {
              clientId: client.id,
              clientName: client.name,
              reportWeekKey,
            })
          } else if (result.outcome === "IN_PROGRESS") {
            logWarn("client_in_progress", {
              clientId: client.id,
              clientName: client.name,
              reportWeekKey,
            })
          } else if (result.outcome === "SKIPPED_INELIGIBLE") {
            logWarn("client_skipped_ineligible", {
              clientId: client.id,
              clientName: client.name,
            })
          } else {
            logInfo("client_dry_run_ready", {
              clientId: client.id,
              clientName: client.name,
              reportWeekKey,
            })
          }

          return {
            clientId: client.id,
            outcome: result.outcome,
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Erro ao processar cliente."

          logError("weekly-reports.client", error, {
            clientId: client.id,
            clientName: client.name,
            reportWeekKey,
          })

          logWarn("client_failed", {
            clientId: client.id,
            clientName: client.name,
            reportWeekKey,
            errorMessage: message,
          })

          return {
            clientId: client.id,
            outcome: "FAILED" as const,
          }
        }
      })
    )

    for (const result of results) {
      if (result.status !== "fulfilled") {
        failedClients += 1
        processedClients += 1
        continue
      }

      processedClients += 1

      switch (result.value.outcome) {
        case "SENT":
          successfulClients += 1
          break
        case "ALREADY_SENT":
          alreadySentClients += 1
          break
        case "IN_PROGRESS":
          inProgressClients += 1
          break
        case "SKIPPED_INELIGIBLE":
          skippedIneligibleClients += 1
          break
        case "DRY_RUN_READY":
          break
        case "FAILED":
          failedClients += 1
          break
      }
    }

    cursor = clients[clients.length - 1]?.id ?? cursor

    if (clients.length < take) {
      break
    }

    if (Date.now() - startedAt.getTime() >= maxRuntimeMs - CONTINUATION_BUFFER_MS) {
      hasMore = true
      stopReason = "TIME_BUDGET"
      break
    }

    if (batchDelayMs > 0) {
      await sleep(batchDelayMs)
    }
  }

  const durationMs = Date.now() - startedAt.getTime()

  logInfo("finished", {
    trigger,
    reportWeekKey,
    totalEligibleClients,
    processedClients,
    successfulClients,
    alreadySentClients,
    inProgressClients,
    failedClients,
    skippedIneligibleClients,
    totalBatches,
    durationMs,
    stopReason,
    hasMore,
    nextCursor: hasMore ? cursor : null,
  })

  return {
    ok: failedClients === 0,
    trigger,
    reportWeekKey,
    timeZone,
    window,
    batchSize,
    batchDelayMs,
    maxRuntimeMs,
    totalEligibleClients,
    processedClients,
    successfulClients,
    alreadySentClients,
    inProgressClients,
    failedClients,
    skippedIneligibleClients,
    totalBatches,
    durationMs,
    hasMore,
    nextCursor: hasMore ? cursor : null,
    stopReason,
    dryRun: Boolean(params.dryRun),
  }
}
