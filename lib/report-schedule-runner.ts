import "server-only"

import { processDueReportSchedules } from "@/lib/report-schedule"
import { logError } from "@/lib/safe-logger"

const DEFAULT_REPORT_SCHEDULE_POLL_SECONDS = 5
const DEFAULT_REPORT_SCHEDULE_RETRY_MINUTES = 15

type GlobalReportScheduleRunnerState = typeof globalThis & {
  __greatgoReportScheduleLoop?: NodeJS.Timeout
  __greatgoReportScheduleProcessing?: boolean
}

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const parsedValue = Number.parseInt(rawValue ?? "", 10)

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback
  }

  return parsedValue
}

function getRetryMinutes() {
  return parsePositiveInt(
    process.env.REPORT_AUTOMATION_DAEMON_RETRY_MINUTES,
    DEFAULT_REPORT_SCHEDULE_RETRY_MINUTES
  )
}

async function runReportScheduleCycle() {
  const globalState = globalThis as GlobalReportScheduleRunnerState

  if (globalState.__greatgoReportScheduleProcessing) {
    return
  }

  globalState.__greatgoReportScheduleProcessing = true

  try {
    await processDueReportSchedules({
      retryMinutes: getRetryMinutes(),
    })
  } catch (error) {
    logError("report-schedule.runner", error)
  } finally {
    globalState.__greatgoReportScheduleProcessing = false
  }
}

export function ensureReportScheduleLoopStarted() {
  if (typeof window !== "undefined") {
    return
  }

  const globalState = globalThis as GlobalReportScheduleRunnerState

  if (globalState.__greatgoReportScheduleLoop) {
    return
  }

  const pollSeconds = parsePositiveInt(
    process.env.REPORT_SCHEDULE_POLL_SECONDS,
    DEFAULT_REPORT_SCHEDULE_POLL_SECONDS
  )

  globalState.__greatgoReportScheduleLoop = setInterval(() => {
    void runReportScheduleCycle()
  }, pollSeconds * 1_000)

  globalState.__greatgoReportScheduleLoop.unref?.()
}

export function triggerReportScheduleCycle() {
  if (typeof window !== "undefined") {
    return
  }

  void runReportScheduleCycle()
}
