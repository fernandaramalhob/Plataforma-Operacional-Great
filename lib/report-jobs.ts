import { Worker, type Job } from "bullmq"
import {
  buildAutomationReferenceWeekDate,
  loadReportAutomationSettings,
  maskAutomationGroupId,
} from "@/lib/report-automation"
import {
  buildReferenceWeekDate,
  buildReportJobErrorPayload,
  buildStoredReportPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import {
  handleTerminalJobFailure,
  recordReportAlert,
} from "@/lib/report-monitoring"
import { recordIntegrationAlertSafely } from "@/lib/integration-monitoring"
import { prisma } from "@/lib/prisma"
import {
  REPORT_GENERATION_QUEUE_NAME,
  REPORT_SEND_QUEUE_NAME,
  REPORT_WEEKLY_QUEUE_NAME,
  type GenerateReportJobData,
  type SendReportJobData,
  type WeeklyReportDispatchJobData,
  enqueueReportSendJob,
  getReportQueuePrefix,
  upsertWeeklyReportJobScheduler,
} from "@/lib/report-queue"
import {
  buildLastCompletedWeekRange,
  generateLiveReportPayload,
  queueReportGeneration,
} from "@/lib/report-service"
import { sendPersistedReportNow } from "@/lib/report-delivery"
import { getRedisConnection } from "@/lib/redis"
import { logError } from "@/lib/safe-logger"

type GlobalWorkerState = typeof globalThis & {
  __greatgoReportGenerationWorker?: Worker<GenerateReportJobData>
  __greatgoReportSendWorker?: Worker<SendReportJobData>
  __greatgoReportWeeklyWorker?: Worker<WeeklyReportDispatchJobData>
  __greatgoReportWorkerBootstrapPromise?: Promise<void>
}

function getWorkerConcurrency(envName: string, fallback: number) {
  const value = Number.parseInt(process.env[envName] ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return fallback
  }

  return value
}

function getBatchSize(envName: string, fallback: number) {
  const value = Number.parseInt(process.env[envName] ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return fallback
  }

  return value
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
    throw new Error("Nenhum administrador disponível para executar o job semanal")
  }

  return admin.id
}

async function processReportGeneration(job: Job<GenerateReportJobData>) {
  const report = await prisma.report.findUnique({
    where: { id: job.data.reportId },
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
    },
  })

  if (!report) {
    throw new Error("Relatório não encontrado para processamento")
  }

  const user = await prisma.user.findUnique({
    where: { id: job.data.requestedByUserId },
    select: {
      id: true,
      metaAccessToken: true,
      metaTokenExpiresAt: true,
    },
  })

  if (!user) {
    throw new Error("Usuário responsável pelo job não encontrado")
  }

  let failureStage: "GENERATION" | "SEND" = "GENERATION"

  try {
    const payload = await generateLiveReportPayload({
      user,
      client: report.client,
      filters: {
        since: job.data.since,
        until: job.data.until,
        objective: job.data.objective,
      },
    })
    const generatedAt = new Date()
    const storedPayload = buildStoredReportPayload(
      payload,
      {
        since: job.data.since,
        until: job.data.until,
        objective: job.data.objective,
      },
      generatedAt
    )

    await prisma.report.update({
      where: { id: report.id },
      data: {
        generatedAt,
        referenceWeek: buildReferenceWeekDate(job.data.since),
        status: "PENDING",
        payloadJson: serializeStoredReportPayload(storedPayload),
      },
    })
    if (job.data.enqueueSendOnComplete) {
      failureStage = "SEND"
      await enqueueReportSendJob({
        reportId: report.id,
      })
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar relatório"

    logError("report-jobs.generate", error, {
      reportId: job.data.reportId,
      jobId: job.id,
    })

    await prisma.report.update({
      where: { id: job.data.reportId },
      data: {
        status: "FAILED",
        payloadJson: buildReportJobErrorPayload(message, failureStage),
      },
    })

    throw error
  }
}

async function processReportSend(job: Job<SendReportJobData>) {
  const automationSettings = loadReportAutomationSettings()
  const report = await prisma.report.findUnique({
    where: { id: job.data.reportId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          whatsappGroupId: true,
        },
      },
    },
  })

  if (!report) {
    throw new Error("Relatório não encontrado para envio")
  }

  try {
    return await sendPersistedReportNow(report.id, {
      mode: automationSettings.sendMode,
      groupId: automationSettings.groupId,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar relatório"
    const attemptsConfigured = job.opts.attempts ?? 1
    const currentAttempt = job.attemptsMade + 1

    logError("report-jobs.send", error, {
      reportId: report.id,
      jobId: job.id,
    })

    await recordIntegrationAlertSafely({
      severity: currentAttempt >= attemptsConfigured ? "error" : "warning",
      integration: "whatsapp",
      source: "send-report",
      message:
        currentAttempt >= attemptsConfigured
          ? "Falha definitiva ao enviar relatório para o WhatsApp."
          : "Falha ao enviar relatório para o WhatsApp. O sistema vai tentar novamente.",
      dedupeKey: `${report.id}:send:${currentAttempt}`,
      details: {
        reportId: report.id,
        clientId: report.client.id,
        clientName: report.client.name,
        sendLogId: null,
        attemptNumber: null,
        currentAttempt,
        attemptsConfigured,
        jobId: job.id ? String(job.id) : null,
        whatsappGroupId: maskAutomationGroupId(
          automationSettings.groupId || report.client.whatsappGroupId
        ),
        errorMessage: message,
      },
    })

    throw error
  }
}

async function processWeeklyReportDispatch(
  job: Job<WeeklyReportDispatchJobData>
) {
  const batchSize = getBatchSize("REPORT_WEEKLY_BATCH_SIZE", 10)
  const automationSettings = loadReportAutomationSettings()
  const objective =
    process.env.REPORT_WEEKLY_OBJECTIVE?.trim() || automationSettings.objective
  const { since, until } = buildLastCompletedWeekRange(new Date(job.timestamp))
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
      take: batchSize,
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

    const results = await Promise.allSettled(
      clients.map(async (client) => {
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
            return null
          }
        }

        const requestedByUserId = await resolveWeeklyRequestedByUserId(
          client.managerId
        )
        const report = await queueReportGeneration({
          clientId: client.id,
          filters: {
            since,
            until,
            objective,
          },
          requestedByUserId,
          enqueueSendOnComplete: true,
        })

        return report.id
      })
    )

    results.forEach((result) => {
      if (result.status === "fulfilled") {
        if (result.value) {
          queuedReports += 1
          return
        }

        skippedClients += 1
        return
      }

      failedClients += 1
    })

    for (const [index, result] of results.entries()) {
      if (result.status === "fulfilled") {
        continue
      }

      await recordReportAlert({
        severity: "warning",
        source: "weekly-client-dispatch",
        queueName: REPORT_WEEKLY_QUEUE_NAME,
        message: "Falha ao enfileirar um cliente ativo no job semanal.",
        jobId: job.id ? String(job.id) : null,
        jobName: job.name,
        details: {
          clientId: clients[index]?.id,
          clientName: clients[index]?.name,
          reason:
            result.reason instanceof Error
              ? result.reason.message
              : result.reason,
        },
      })
    }

    cursor = clients[clients.length - 1]?.id
  }

  if (failedClients > 0) {
    await recordReportAlert({
      severity: "warning",
      source: "weekly-dispatch-summary",
      queueName: REPORT_WEEKLY_QUEUE_NAME,
      message: "Job semanal concluiu com clientes que não puderam ser enfileirados.",
      jobId: job.id ? String(job.id) : null,
      jobName: job.name,
      details: {
        totalClients,
        queuedReports,
        failedClients,
        skippedClients,
      },
    })
  }

  return {
    source: job.data.source,
    since,
    until,
    objective,
    totalClients,
    queuedReports,
    failedClients,
    skippedClients,
  }
}

function buildGenerationWorker() {
  return new Worker<GenerateReportJobData>(
    REPORT_GENERATION_QUEUE_NAME,
    processReportGeneration,
    {
      connection: getRedisConnection("worker"),
      prefix: getReportQueuePrefix(),
      concurrency: getWorkerConcurrency("REPORT_GENERATION_CONCURRENCY", 2),
    }
  )
}

function buildSendWorker() {
  return new Worker<SendReportJobData>(REPORT_SEND_QUEUE_NAME, processReportSend, {
    connection: getRedisConnection("worker"),
    prefix: getReportQueuePrefix(),
    concurrency: getWorkerConcurrency("REPORT_SEND_CONCURRENCY", 1),
  })
}

function buildWeeklyWorker() {
  return new Worker<WeeklyReportDispatchJobData>(
    REPORT_WEEKLY_QUEUE_NAME,
    processWeeklyReportDispatch,
    {
      connection: getRedisConnection("worker"),
      prefix: getReportQueuePrefix(),
      concurrency: 1,
    }
  )
}

export async function ensureReportWorkersStarted() {
  const globalState = globalThis as GlobalWorkerState

  if (!globalState.__greatgoReportGenerationWorker) {
    globalState.__greatgoReportGenerationWorker = buildGenerationWorker()
    globalState.__greatgoReportGenerationWorker.on("failed", (job, error) => {
      void handleTerminalJobFailure(
        REPORT_GENERATION_QUEUE_NAME,
        job,
        error
      ).catch((failureError) => {
        logError("report-jobs.generate.monitoring", failureError, {
          reportId: job?.data.reportId,
          jobId: job?.id,
        })
      })
    })
  }

  if (!globalState.__greatgoReportSendWorker) {
    globalState.__greatgoReportSendWorker = buildSendWorker()
    globalState.__greatgoReportSendWorker.on("failed", (job, error) => {
      void handleTerminalJobFailure(REPORT_SEND_QUEUE_NAME, job, error).catch(
        (failureError) => {
          logError("report-jobs.send.monitoring", failureError, {
            reportId: job?.data.reportId,
            jobId: job?.id,
          })
        }
      )
    })
  }

  if (!globalState.__greatgoReportWeeklyWorker) {
    globalState.__greatgoReportWeeklyWorker = buildWeeklyWorker()
    globalState.__greatgoReportWeeklyWorker.on("failed", (job, error) => {
      void handleTerminalJobFailure(REPORT_WEEKLY_QUEUE_NAME, job, error).catch(
        (failureError) => {
          logError("report-jobs.weekly.monitoring", failureError, {
            jobId: job?.id,
          })
        }
      )
    })
  }

  if (!globalState.__greatgoReportWorkerBootstrapPromise) {
    globalState.__greatgoReportWorkerBootstrapPromise =
      upsertWeeklyReportJobScheduler()
        .then(() => undefined)
        .catch((error) => {
          globalState.__greatgoReportWorkerBootstrapPromise = undefined
          throw error
        })
  }

  await globalState.__greatgoReportWorkerBootstrapPromise
}
