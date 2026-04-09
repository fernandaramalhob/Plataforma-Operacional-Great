import { NextResponse } from "next/server"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"
import { processPendingReportBatch } from "@/lib/report-processing"
import { processDueReportSchedules } from "@/lib/report-schedule"
import { logError } from "@/lib/safe-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

function getBatchSize() {
  const value = Number.parseInt(process.env.REPORT_PROCESS_BATCH_SIZE ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return 5
  }

  return value
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const batchSize = getBatchSize()

  try {
    const schedules = await processDueReportSchedules({ limit: batchSize })

    const processing = await processPendingReportBatch(batchSize)

    return NextResponse.json({
      ok: true,
      checkedAt: new Date().toISOString(),
      schedulesProcessed: schedules,
      processing,
    })
  } catch (error) {
    logError("cron.report-jobs.get", error)
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    )
  }
}
