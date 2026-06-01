import { prisma } from "@/lib/prisma"
import {
  listPendingQueuedReportIds,
  processPendingReportBatch,
} from "@/lib/report-processing"
import { processDueReportSchedules } from "@/lib/report-schedule"
import { touchReportWorkerHeartbeat } from "@/lib/report-worker-health"
import { logError, logInfo } from "@/lib/safe-logger"

export async function runDueReportScheduleSweep(params?: {
  source?: string
  limit?: number
}) {
  const source = params?.source?.trim() || "unknown"

  try {
    const dueSchedules = await prisma.reportSchedule.count({
      where: {
        active: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
    })
    const pendingReportIds = await listPendingQueuedReportIds(1)

    if (dueSchedules === 0 && pendingReportIds.length === 0) {
      return {
        dueSchedules,
        pendingReports: 0,
        processed: 0,
        reportsAttempted: 0,
        ran: false,
      }
    }

    logInfo("report-schedule.fallback.start", {
      source,
      dueSchedules,
      pendingReports: pendingReportIds.length,
    })

    const processed = await processDueReportSchedules({
      limit: params?.limit,
    })
    const reportProcessing = await processPendingReportBatch(params?.limit)

    await touchReportWorkerHeartbeat().catch((error) => {
      logError("report-schedule.fallback.heartbeat", error, {
        source,
      })
    })

    logInfo("report-schedule.fallback.done", {
      source,
      dueSchedules,
      processed,
      reportsAttempted: reportProcessing.attempted,
      reportsProcessed: reportProcessing.processed,
      reportsFailed: reportProcessing.failed,
    })

    return {
      dueSchedules,
      pendingReports: pendingReportIds.length,
      processed,
      reportsAttempted: reportProcessing.attempted,
      ran: true,
    }
  } catch (error) {
    logError("report-schedule.fallback", error, {
      source,
      stage: "count-or-process",
    })

    return {
      dueSchedules: 0,
      pendingReports: 0,
      processed: 0,
      reportsAttempted: 0,
      ran: false,
    }
  }
}
