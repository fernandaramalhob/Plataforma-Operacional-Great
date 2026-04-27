import { NextResponse } from "next/server"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"
import { recordReportAlert } from "@/lib/report-monitoring"
import { runDueReportScheduleSweep } from "@/lib/report-schedule-fallback"
import {
  getReportWorkerHealth,
  markReportWorkerAlertSent,
  shouldRecordReportWorkerAlert,
} from "@/lib/report-worker-health"
import { logError } from "@/lib/safe-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

async function handleRequest(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    await runDueReportScheduleSweep({
      source: "cron-jobs-health",
      limit: 10,
    })

    const health = await getReportWorkerHealth()

    if (shouldRecordReportWorkerAlert(health)) {
      await recordReportAlert({
        severity: "error",
        source: "worker-health",
        queueName: "report-worker",
        message: health.detail,
        jobId: null,
        jobName: "report-worker",
        details: {
          status: health.status,
          lastHeartbeatAt: health.lastHeartbeatAt,
          lastError: health.lastError,
          staleAfterMinutes: health.staleAfterMinutes,
        },
      })

      await markReportWorkerAlertSent()
    }

    return NextResponse.json(
      {
        ok: health.ok,
        checkedAt: health.checkedAt,
        worker: health,
      },
      {
        status: health.ok ? 200 : 503,
      }
    )
  } catch (error) {
    logError("cron.jobs-health", error)

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno",
      },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  return handleRequest(request)
}

export async function POST(request: Request) {
  return handleRequest(request)
}
