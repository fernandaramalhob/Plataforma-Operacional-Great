import { NextResponse } from "next/server"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"
import { runWeeklyReports } from "@/lib/reporting/runWeeklyReports"
import { logError } from "@/lib/safe-logger"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 300

type WeeklyReportsRequestBody = {
  cursor?: string | null
  reportWeekKey?: string | null
  batchSize?: number | null
  batchDelayMs?: number | null
  maxRuntimeMs?: number | null
  maxClients?: number | null
  dryRun?: boolean
  trigger?: "manual" | "continuation"
}

function resolveBaseUrl(request: Request) {
  return (
    process.env.REPORT_AUTOMATION_BASE_URL?.trim()
    || process.env.NEXTAUTH_URL?.trim()
    || new URL(request.url).origin
  )
}

async function readRequestBody(request: Request) {
  if (request.method !== "POST") {
    return {} satisfies WeeklyReportsRequestBody
  }

  try {
    const rawBody = await request.text()

    if (!rawBody.trim()) {
      return {} satisfies WeeklyReportsRequestBody
    }

    return JSON.parse(rawBody) as WeeklyReportsRequestBody
  } catch {
    throw new Error("Corpo JSON invalido para o cron semanal.")
  }
}

async function triggerContinuation(params: {
  request: Request
  reportWeekKey: string
  cursor: string
  batchSize: number
  batchDelayMs: number
  maxRuntimeMs: number
}) {
  const secret = process.env.CRON_SECRET?.trim()

  if (!secret) {
    return {
      triggered: false,
      reason: "CRON_SECRET nao configurado",
    }
  }

  const baseUrl = resolveBaseUrl(params.request)

  try {
    const response = await fetch(`${baseUrl}/api/cron/send-reports`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        cursor: params.cursor,
        reportWeekKey: params.reportWeekKey,
        batchSize: params.batchSize,
        batchDelayMs: params.batchDelayMs,
        maxRuntimeMs: params.maxRuntimeMs,
        trigger: "continuation",
      } satisfies WeeklyReportsRequestBody),
      signal: AbortSignal.timeout(10_000),
    })

    return {
      triggered: response.ok,
      status: response.status,
      reason: response.ok ? null : `HTTP ${response.status}`,
    }
  } catch (error) {
    logError("cron.send-reports.continuation", error, {
      reportWeekKey: params.reportWeekKey,
      cursor: params.cursor,
    })

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

  let body: WeeklyReportsRequestBody

  try {
    body = await readRequestBody(request)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Payload invalido",
      },
      { status: 400 }
    )
  }

  try {
    const summary = await runWeeklyReports({
      now: new Date(),
      cursor: body.cursor,
      reportWeekKey: body.reportWeekKey,
      batchSize: body.batchSize,
      batchDelayMs: body.batchDelayMs,
      maxRuntimeMs: body.maxRuntimeMs,
      maxClients: body.maxClients,
      dryRun: body.dryRun,
      trigger: request.method === "GET" ? "cron" : body.trigger ?? "manual",
    })

    const continuation =
      summary.hasMore && summary.nextCursor && !summary.dryRun
        ? await triggerContinuation({
            request,
            reportWeekKey: summary.reportWeekKey,
            cursor: summary.nextCursor,
            batchSize: summary.batchSize,
            batchDelayMs: summary.batchDelayMs,
            maxRuntimeMs: summary.maxRuntimeMs,
          })
        : null

    return NextResponse.json(
      {
        ...summary,
        continuation,
        note:
          "No plano Hobby da Vercel, o cron semanal pode executar em qualquer momento dentro da hora agendada, nao exatamente no minuto 10:00.",
      },
      {
        status: continuation?.triggered ? 202 : 200,
      }
    )
  } catch (error) {
    logError("cron.send-reports", error)

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
