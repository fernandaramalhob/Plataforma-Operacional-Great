import { randomUUID } from "node:crypto"
import { Queue, type JobsOptions } from "bullmq"
import { getRedisConnection } from "@/lib/redis"

export const REPORT_GENERATION_QUEUE_NAME = "report-generation"
export const REPORT_SEND_QUEUE_NAME = "report-send"
export const REPORT_WEEKLY_QUEUE_NAME = "report-weekly"
export const REPORT_DEAD_LETTER_QUEUE_NAME = "report-dead-letter"

const REPORT_QUEUE_PREFIX = process.env.REPORT_QUEUE_PREFIX?.trim() || "greatgo"
export const REPORT_WEEKLY_SCHEDULER_ID = "weekly-report-dispatch"

type GlobalQueueState = typeof globalThis & {
  __greatgoReportGenerationQueue?: Queue<GenerateReportJobData>
  __greatgoReportSendQueue?: Queue<SendReportJobData>
  __greatgoReportWeeklyQueue?: Queue<WeeklyReportDispatchJobData>
  __greatgoReportDeadLetterQueue?: Queue<DeadLetterJobData>
}

const defaultJobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000,
  },
  removeOnComplete: 100,
  removeOnFail: 200,
}

const weeklyDispatchJobOptions: JobsOptions = {
  attempts: 1,
  removeOnComplete: 20,
  removeOnFail: 50,
}

const deadLetterJobOptions: JobsOptions = {
  attempts: 1,
  removeOnComplete: false,
  removeOnFail: false,
}

export type GenerateReportJobData = {
  reportId: string
  clientId: string
  since: string
  until: string
  objective: string
  requestedByUserId: string
  enqueueSendOnComplete?: boolean
}

export type SendReportJobData = {
  reportId: string
}

export type WeeklyReportDispatchJobData = {
  source: "scheduler"
  triggeredAt: string
}

export type DeadLetterJobData = {
  queueName: string
  jobId: string
  jobName: string
  errorMessage: string
  failedAt: string
  attemptsMade: number
  attemptsConfigured: number
  payload: unknown
}

function buildQueue<T>(name: string, jobOptions = defaultJobOptions) {
  return new Queue<T>(name, {
    connection: getRedisConnection("client"),
    prefix: REPORT_QUEUE_PREFIX,
    defaultJobOptions: jobOptions,
  })
}

export function getReportGenerationQueue() {
  const globalState = globalThis as GlobalQueueState
  globalState.__greatgoReportGenerationQueue ??= buildQueue<GenerateReportJobData>(
    REPORT_GENERATION_QUEUE_NAME
  )

  return globalState.__greatgoReportGenerationQueue
}

export function getReportSendQueue() {
  const globalState = globalThis as GlobalQueueState
  globalState.__greatgoReportSendQueue ??= buildQueue<SendReportJobData>(
    REPORT_SEND_QUEUE_NAME
  )

  return globalState.__greatgoReportSendQueue
}

export function getReportWeeklyQueue() {
  const globalState = globalThis as GlobalQueueState
  globalState.__greatgoReportWeeklyQueue ??=
    buildQueue<WeeklyReportDispatchJobData>(
      REPORT_WEEKLY_QUEUE_NAME,
      weeklyDispatchJobOptions
    )

  return globalState.__greatgoReportWeeklyQueue
}

export function getReportDeadLetterQueue() {
  const globalState = globalThis as GlobalQueueState
  globalState.__greatgoReportDeadLetterQueue ??=
    buildQueue<DeadLetterJobData>(
      REPORT_DEAD_LETTER_QUEUE_NAME,
      deadLetterJobOptions
    )

  return globalState.__greatgoReportDeadLetterQueue
}

export async function enqueueReportGenerationJob(data: GenerateReportJobData) {
  return getReportGenerationQueue().add("generate-report", data, {
    jobId: `report:${data.reportId}:generate`,
  })
}

export async function enqueueReportSendJob(data: SendReportJobData) {
  return getReportSendQueue().add("send-report", data, {
    jobId: `report:${data.reportId}:send:${randomUUID()}`,
  })
}

export async function enqueueDeadLetterJob(data: DeadLetterJobData) {
  return getReportDeadLetterQueue().add("dead-letter", data, {
    jobId: `dead-letter:${data.queueName}:${data.jobId}:${Date.now()}`,
  })
}

export async function upsertWeeklyReportJobScheduler() {
  const pattern = process.env.REPORT_WEEKLY_CRON?.trim() || "0 9 * * 4"
  const timezone = process.env.REPORT_WEEKLY_TZ?.trim() || "America/Sao_Paulo"

  return getReportWeeklyQueue().upsertJobScheduler(
    REPORT_WEEKLY_SCHEDULER_ID,
    {
      pattern,
      tz: timezone,
    },
    {
      name: "dispatch-weekly-reports",
      data: {
        source: "scheduler",
        triggeredAt: new Date().toISOString(),
      },
      opts: {
        removeOnComplete: 20,
        removeOnFail: 50,
      },
    }
  )
}

export function getReportQueuePrefix() {
  return REPORT_QUEUE_PREFIX
}
