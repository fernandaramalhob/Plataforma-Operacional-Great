import { Worker, type Job } from "bullmq"
import {
  buildReferenceWeekDate,
  buildReportJobErrorPayload,
  buildStoredReportPayload,
  parseStoredReportPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import { sendWhatsAppText } from "@/lib/evolution-api"
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
import { buildWhatsAppReportMessage } from "@/lib/report-message"
import {
  buildLastCompletedWeekRange,
  generateLiveReportPayload,
  queueReportGeneration,
} from "@/lib/report-service"
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

function maskWhatsAppDestination(destination: string | null) {
  if (!destination) {
    return null
  }

  const normalized = destination.trim()

  if (normalized.length <= 6) {
    return "[REDACTED]"
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`
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
    throw new Error("Relatorio nao encontrado para processamento")
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
    throw new Error("Usuario responsavel pelo job nao encontrado")
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
      error instanceof Error ? error.message : "Erro ao gerar relatorio"

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
      throw new Error("Relatorio ainda nao foi gerado")
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

    return delivery
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao enviar relatorio"
    const attemptsConfigured = job.opts.attempts ?? 1
    const currentAttempt = job.attemptsMade + 1

    logError("report-jobs.send", error, {
      reportId: report.id,
      sendLogId: sendLog.id,
      jobId: job.id,
    })

    await recordIntegrationAlertSafely({
      severity: currentAttempt >= attemptsConfigured ? "error" : "warning",
      integration: "whatsapp",
      source: "send-report",
      message:
        currentAttempt >= attemptsConfigured
          ? "Falha definitiva ao enviar relatorio para o WhatsApp."
          : "Falha ao enviar relatorio para o WhatsApp. O sistema vai tentar novamente.",
      dedupeKey: `${report.id}:${sendLog.id}:${currentAttempt}`,
      details: {
        reportId: report.id,
        clientId: report.client.id,
        clientName: report.client.name,
        sendLogId: sendLog.id,
        attemptNumber,
        currentAttempt,
        attemptsConfigured,
        jobId: job.id ? String(job.id) : null,
        whatsappGroupId: maskWhatsAppDestination(report.client.whatsappGroupId),
        errorMessage: message,
      },
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

async function processWeeklyReportDispatch(
  job: Job<WeeklyReportDispatchJobData>
) {
  const batchSize = getBatchSize("REPORT_WEEKLY_BATCH_SIZE", 10)
  const objective = process.env.REPORT_WEEKLY_OBJECTIVE?.trim() || "ALL"
  const { since, until } = buildLastCompletedWeekRange(new Date(job.timestamp))
  let cursor: string | undefined
  let totalClients = 0
  let queuedReports = 0
  let failedClients = 0

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
        managerId: true,
      },
    })

    if (clients.length === 0) {
      break
    }

    totalClients += clients.length

    const results = await Promise.allSettled(
      clients.map(async (client) => {
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
        queuedReports += 1
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
          reason: result.reason,
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
      message: "Job semanal concluiu com clientes que nao puderam ser enfileirados.",
      jobId: job.id ? String(job.id) : null,
      jobName: job.name,
      details: {
        totalClients,
        queuedReports,
        failedClients,
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
