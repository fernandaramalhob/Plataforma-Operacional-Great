import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { getHistoryStatusFilter, mapReportToHistoryRow } from "@/lib/report-domain"
import { logError } from "@/lib/safe-logger"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = getHistoryStatusFilter(searchParams.get("status"))
    const clientId = searchParams.get("clientId")
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const where: Prisma.ReportWhereInput = {
      generatedAt: { gte: thirtyDaysAgo },
    }

    if (status) {
      where.status = status
    }

    if (clientId) {
      where.clientId = clientId
    }

    if (!isAdmin(user)) {
      where.client = {
        managerId: user.id,
      }
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      include: {
        client: {
          select: {
            name: true,
            company: true,
          },
        },
        sendLogs: {
          select: {
            attemptNumber: true,
            sentAt: true,
            errorMessage: true,
          },
          orderBy: { attemptNumber: "desc" },
        },
      },
    })

    return NextResponse.json(reports.map(mapReportToHistoryRow))
  } catch (error) {
    logError("history.get", error)
    return NextResponse.json([], { status: 200 })
  }
}
