import { prisma } from "@/lib/prisma"
import { processDueReportSchedules } from "@/lib/report-schedule"
import { touchReportWorkerHeartbeat } from "@/lib/report-worker-health"
import { logError, logInfo } from "@/lib/safe-logger"

export async function runDueReportScheduleSweep(params?: {
  source?: string
  limit?: number
}) {
  const source = params?.source?.trim() || "unknown"
  const dueSchedules = await prisma.reportSchedule.count({
    where: {
      active: true,
      nextRunAt: {
        lte: new Date(),
      },
    },
  })

  if (dueSchedules === 0) {
    return {
      dueSchedules,
      processed: 0,
      ran: false,
    }
  }

  logInfo("report-schedule.fallback.start", {
    source,
    dueSchedules,
  })

  try {
    const processed = await processDueReportSchedules({
      limit: params?.limit,
    })

    await touchReportWorkerHeartbeat().catch((error) => {
      logError("report-schedule.fallback.heartbeat", error, {
        source,
      })
    })

    logInfo("report-schedule.fallback.done", {
      source,
      dueSchedules,
      processed,
    })

    return {
      dueSchedules,
      processed,
      ran: true,
    }
  } catch (error) {
    logError("report-schedule.fallback", error, {
      source,
      dueSchedules,
    })

    return {
      dueSchedules,
      processed: 0,
      ran: false,
    }
  }
}
