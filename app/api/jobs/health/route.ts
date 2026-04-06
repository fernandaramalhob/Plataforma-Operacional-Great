import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { getReportQueuesHealth } from "@/lib/report-monitoring"
import { logError } from "@/lib/safe-logger"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    if (!isAdmin(user)) {
      return NextResponse.json(
        { error: "Apenas administradores podem consultar a saúde dos jobs" },
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
      { error: "Não foi possível verificar a saúde dos jobs" },
      { status: 500 }
    )
  }
}
