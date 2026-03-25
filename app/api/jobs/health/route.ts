import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { ensureReportWorkersStarted } from "@/lib/report-jobs"
import { getReportQueuesHealth } from "@/lib/report-monitoring"
import { logError } from "@/lib/safe-logger"

export async function GET() {
  try {
    await ensureReportWorkersStarted()
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem consultar a saude dos jobs" },
        { status: 403 }
      )
    }

    const health = await getReportQueuesHealth()

    return NextResponse.json(health, {
      status: health.ok ? 200 : 503,
    })
  } catch (error) {
    logError("jobs.health.get", error)
    return NextResponse.json(
      { error: "Nao foi possivel verificar a saude dos jobs" },
      { status: 500 }
    )
  }
}
