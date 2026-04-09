import { NextResponse } from "next/server"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"
import {
  listPendingQueuedReportIds,
  processPendingReportBatch,
} from "@/lib/report-processing"
import { prisma } from "@/lib/prisma"
import { processDueReportSchedules } from "@/lib/report-schedule"
import { logError } from "@/lib/safe-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

const DEFAULT_CONTINUATION_TIMEOUT_MS = 240_000
const CONTINUATION_BUFFER_MS = 15_000

function getBatchSize() {
  const value = Number.parseInt(process.env.REPORT_PROCESS_BATCH_SIZE ?? "", 10)

  if (!Number.isFinite(value) || value < 1) {
    return 5
  }

  return value
}

function resolveBaseUrl(request: Request) {
  return (
    process.env.REPORT_AUTOMATION_BASE_URL?.trim()
    || process.env.NEXTAUTH_URL?.trim()
    || new URL(request.url).origin
  )
}

function getMaxRuntimeMs() {
  const seconds = Number.parseInt(process.env.REPORT_CRON_MAX_RUNTIME_SECONDS ?? "", 10)

  if (!Number.isFinite(seconds) || seconds < 30) {
    return DEFAULT_CONTINUATION_TIMEOUT_MS
  }

  return seconds * 1_000
}

async function hasMoreDueWork() {
  const [dueSchedulesCount, pendingIds] = await Promise.all([
    prisma.reportSchedule.count({
      where: {
        active: true,
        nextRunAt: {
          lte: new Date(),
        },
      },
    }),
    listPendingQueuedReportIds(1),
  ])

  return {
    dueSchedulesCount,
    pendingReportsCount: pendingIds.length,
    hasMore: dueSchedulesCount > 0 || pendingIds.length > 0,
  }
}

async function triggerContinuation(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    return {
      triggered: false,
      reason: "CRON_SECRET nao configurado",
    }
  }

  try {
    const response = await fetch(`${resolveBaseUrl(request)}/api/cron/report-jobs`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
      },
      signal: AbortSignal.timeout(10_000),
    })

    return {
      triggered: response.ok,
      status: response.status,
      reason: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    logError("cron.report-jobs.continuation", error)
    return {
      triggered: false,
      reason: error instanceof Error ? error.message : "Falha ao disparar continuacao",
    }
  }
}

async function handleRequest(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  const batchSize = getBatchSize()
  const startedAt = Date.now()
  let schedulePasses = 0
  let totalSchedulesProcessed = 0
  let totalReportsAttempted = 0
  let totalReportsProcessed = 0
  let totalReportsFailed = 0
  let totalReportsSkipped = 0

  try {
    while (Date.now() - startedAt < getMaxRuntimeMs() - CONTINUATION_BUFFER_MS) {
      const schedulesProcessed = await processDueReportSchedules({
        limit: batchSize,
      })
      schedulePasses += 1
      totalSchedulesProcessed += schedulesProcessed

      const processing = await processPendingReportBatch(batchSize)
      totalReportsAttempted += processing.attempted
      totalReportsProcessed += processing.processed
      totalReportsFailed += processing.failed
      totalReportsSkipped += processing.skipped

      if (schedulesProcessed === 0 && processing.attempted === 0) {
        break
      }
    }

    const remaining = await hasMoreDueWork()
    const continuation =
      remaining.hasMore
        ? await triggerContinuation(request)
        : null

    return NextResponse.json({
      ok: totalReportsFailed === 0,
      checkedAt: new Date().toISOString(),
      schedulePasses,
      schedulesProcessed: totalSchedulesProcessed,
      reportsAttempted: totalReportsAttempted,
      reportsProcessed: totalReportsProcessed,
      reportsFailed: totalReportsFailed,
      reportsSkipped: totalReportsSkipped,
      remaining,
      continuation,
      note:
        "No plano Hobby da Vercel, a execucao pode acontecer em qualquer momento dentro da hora agendada, nao exatamente no minuto 10:00.",
    }, {
      status: continuation?.triggered ? 202 : 200,
    })
  } catch (error) {
    logError("cron.report-jobs.handle", error)
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
