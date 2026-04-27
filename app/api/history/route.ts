import { NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { listEvolutionGroups } from "@/lib/evolution-api"
import { prisma } from "@/lib/prisma"
import {
  getHistoryStatusFilter,
  mapReportToHistoryRow,
  mapScheduleToHistoryRow,
} from "@/lib/report-domain"
import { runDueReportScheduleSweep } from "@/lib/report-schedule-fallback"
import { logError } from "@/lib/safe-logger"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    await runDueReportScheduleSweep({
      source: "history-route",
      limit: 10,
    })

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

    const clientWhere: Prisma.ClientWhereInput = {
      reportSchedule: {
        isNot: null,
      },
    }

    if (!isAdmin(user)) {
      clientWhere.managerId = user.id
    }

    if (clientId) {
      clientWhere.id = clientId
    }

    const reports = await prisma.report.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      include: {
        client: {
          select: {
            name: true,
            company: true,
            whatsappGroupId: true,
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

    const clientsWithSchedules = await prisma.client.findMany({
      where: clientWhere,
      select: {
        id: true,
        name: true,
        company: true,
        whatsappGroupId: true,
        reportSchedule: true,
        reports: {
          orderBy: {
            generatedAt: "desc",
          },
          take: 5,
          select: {
            generatedAt: true,
          },
        },
      },
    })

    let groupNameById = new Map<string, string>()

    try {
      const groups = await listEvolutionGroups()
      groupNameById = new Map(
        groups
          .filter((group) => Boolean(group.id))
          .map((group) => [group.id, group.subject])
      )
    } catch (error) {
      logError("history.groups", error)
    }

    const historyRows = [
      ...reports.map((report) => ({
        row: mapReportToHistoryRow(report),
        sortAt: report.generatedAt,
      })),
      ...clientsWithSchedules.flatMap((client) => {
        if (!client.reportSchedule) {
          return []
        }

        const hasReportAfterSchedule = client.reports.some(
          (report) =>
            report.generatedAt.getTime() >= client.reportSchedule!.createdAt.getTime()
        )

        if (hasReportAfterSchedule) {
          return []
        }

        const groupId =
          client.reportSchedule.groupId?.trim() || client.whatsappGroupId || null
        const groupName = groupId ? groupNameById.get(groupId) ?? null : null

        return [
          {
            row: mapScheduleToHistoryRow(
              client.reportSchedule,
              {
                name: client.name,
                company: client.company,
                whatsappGroupId: client.whatsappGroupId,
              },
              groupName
            ),
            sortAt: client.reportSchedule.createdAt,
          },
        ]
      }),
    ]
      .sort((left, right) => right.sortAt.getTime() - left.sortAt.getTime())
      .map(({ row }) => ({
        ...row,
        groupName: row.groupId ? groupNameById.get(row.groupId) ?? row.groupName : row.groupName,
      }))

    return NextResponse.json(historyRows)
  } catch (error) {
    logError("history.get", error)
    return NextResponse.json(
      {
        error: "Falha ao carregar histórico",
        detail:
          "Não foi possível recuperar o histórico de relatórios neste momento.",
      },
      { status: 500 }
    )
  }
}
