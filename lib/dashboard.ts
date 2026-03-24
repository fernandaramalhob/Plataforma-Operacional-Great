import { Prisma, ReportStatus } from "@prisma/client"
import { getCurrentUser, isAdmin, scopeClientWhere } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { parseStoredReportPayload } from "@/lib/report-domain"

const DAYS_TO_SHOW = 7
const WEEKS_TO_SHOW = 8
const MONTHS_TO_SHOW = 6
const RECENT_ACTIVITY_LIMIT = 5

export type DashboardStatKey =
  | "activeClients"
  | "connectedCampaigns"
  | "reportsGenerated"
  | "failedReports"

export type DashboardStat = {
  key: DashboardStatKey
  label: string
  value: string
  sub: string
  valueColor?: string
  subColor?: string
}

export type DashboardChartPoint = {
  week: string
  reports: number
}

export type DashboardChartFilter = "days" | "weeks" | "months"

export type DashboardChartSeries = {
  label: string
  data: DashboardChartPoint[]
}

export type DashboardChartData = Record<
  DashboardChartFilter,
  DashboardChartSeries
>

export type DashboardActivityStatus =
  | "Enviado"
  | "Falha"
  | "Pendente"
  | "Conectado"

export type DashboardRecentActivityItem = {
  id: string
  name: string
  campaign: string
  status: DashboardActivityStatus
  time: string
}

export type DashboardData = {
  stats: DashboardStat[]
  chart: DashboardChartData
  recentActivity: DashboardRecentActivityItem[]
}

type ClientWithCampaigns = {
  id: string
  name: string
  status: "ACTIVE" | "INACTIVE"
  adAccountId: string | null
  createdAt: Date
  campaigns: {
    campaignIdMeta: string
    campaignName: string
    isActive: boolean
  }[]
}

type RecentReport = {
  id: string
  generatedAt: Date
  status: ReportStatus
  payloadJson: Prisma.JsonValue | null
  client: ClientWithCampaigns
}

function buildEmptyDashboardData(): DashboardData {
  return {
    stats: [
      {
        key: "activeClients",
        label: "Clientes ativos",
        value: "0",
        sub: "0 com Meta conectada",
      },
      {
        key: "connectedCampaigns",
        label: "Campanhas conectadas",
        value: "0",
        sub: "0 ativas",
      },
      {
        key: "reportsGenerated",
        label: "Relatorios gerados",
        value: "0",
        sub: "ultimos 7 dias",
      },
      {
        key: "failedReports",
        label: "Falhas no envio",
        value: "0",
        sub: "ultimos 30 dias",
        valueColor: "text-red-500",
        subColor: "text-red-400",
      },
    ],
    chart: buildChartData([]),
    recentActivity: [],
  }
}

function startOfWeek(date: Date) {
  const normalized = new Date(date)
  const dayOfWeek = normalized.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  normalized.setDate(normalized.getDate() + diffToMonday)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function startOfDay(date: Date) {
  const normalized = new Date(date)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function startOfMonth(date: Date) {
  const normalized = new Date(date)
  normalized.setDate(1)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function formatWeekLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  })
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "2-digit",
  })
}

function formatRelativeTime(date: Date) {
  const diffMs = date.getTime() - Date.now()
  const diffMinutes = Math.round(diffMs / (1000 * 60))
  const relative = new Intl.RelativeTimeFormat("pt-BR", {
    numeric: "auto",
  })

  if (Math.abs(diffMinutes) < 60) {
    return relative.format(diffMinutes, "minute")
  }

  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return relative.format(diffHours, "hour")
  }

  const diffDays = Math.round(diffHours / 24)
  if (Math.abs(diffDays) < 7) {
    return relative.format(diffDays, "day")
  }

  const diffWeeks = Math.round(diffDays / 7)
  return relative.format(diffWeeks, "week")
}

function mapStatusLabel(status: ReportStatus): DashboardActivityStatus {
  if (status === "SENT") {
    return "Enviado"
  }

  if (status === "FAILED") {
    return "Falha"
  }

  return "Pendente"
}

function buildCampaignSummary(campaignNames: string[]) {
  if (campaignNames.length === 0) {
    return "Sem campanhas conectadas"
  }

  if (campaignNames.length === 1) {
    return campaignNames[0]
  }

  return `${campaignNames[0]} +${campaignNames.length - 1}`
}

function extractReportCampaignNames(report: RecentReport) {
  const payload = parseStoredReportPayload(report.payloadJson)

  if (!payload?.campaigns.length) {
    return []
  }

  return payload.campaigns
    .map((campaign) => campaign.name?.trim())
    .filter((campaign): campaign is string => Boolean(campaign))
}

function buildRecentActivityFromReports(reports: RecentReport[]) {
  return reports.slice(0, RECENT_ACTIVITY_LIMIT).map((report) => {
    const reportCampaigns = extractReportCampaignNames(report)
    const storedCampaigns = report.client.campaigns
      .filter((campaign) => campaign.isActive)
      .map((campaign) => campaign.campaignName)

    return {
      id: report.id,
      name: report.client.name,
      campaign: buildCampaignSummary(
        reportCampaigns.length > 0 ? reportCampaigns : storedCampaigns
      ),
      status: mapStatusLabel(report.status),
      time: formatRelativeTime(report.generatedAt),
    }
  })
}

function buildRecentActivityFromClients(clients: ClientWithCampaigns[]) {
  return clients
    .filter((client) => client.adAccountId || client.campaigns.length > 0)
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((client) => ({
      id: client.id,
      name: client.name,
      campaign: buildCampaignSummary(
        client.campaigns
          .filter((campaign) => campaign.isActive)
          .map((campaign) => campaign.campaignName)
      ),
      status: "Conectado" as const,
      time: formatRelativeTime(client.createdAt),
    }))
}

function buildChartData(reports: Array<{ generatedAt: Date }>): DashboardChartData {
  const currentDayStart = startOfDay(new Date())
  const currentWeekStart = startOfWeek(new Date())
  const currentMonthStart = startOfMonth(new Date())

  const days = Array.from({ length: DAYS_TO_SHOW }, (_, index) => {
    const dayStart = new Date(currentDayStart)
    dayStart.setDate(currentDayStart.getDate() - (DAYS_TO_SHOW - index - 1))

    return {
      key: dayStart.getTime(),
      week: formatWeekLabel(dayStart),
      reports: 0,
    }
  })

  const weeks = Array.from({ length: WEEKS_TO_SHOW }, (_, index) => {
    const weekStart = new Date(currentWeekStart)
    weekStart.setDate(currentWeekStart.getDate() - (WEEKS_TO_SHOW - index - 1) * 7)

    return {
      key: weekStart.getTime(),
      week: formatWeekLabel(weekStart),
      reports: 0,
    }
  })

  const months = Array.from({ length: MONTHS_TO_SHOW }, (_, index) => {
    const monthStart = new Date(currentMonthStart)
    monthStart.setMonth(currentMonthStart.getMonth() - (MONTHS_TO_SHOW - index - 1))

    return {
      key: monthStart.getTime(),
      week: formatMonthLabel(monthStart),
      reports: 0,
    }
  })

  const reportsByDay = new Map<number, number>()
  const reportsByWeek = new Map<number, number>()
  const reportsByMonth = new Map<number, number>()

  reports.forEach((report) => {
    const dayKey = startOfDay(report.generatedAt).getTime()
    const weekKey = startOfWeek(report.generatedAt).getTime()
    const monthKey = startOfMonth(report.generatedAt).getTime()

    reportsByDay.set(dayKey, (reportsByDay.get(dayKey) ?? 0) + 1)
    reportsByWeek.set(weekKey, (reportsByWeek.get(weekKey) ?? 0) + 1)
    reportsByMonth.set(monthKey, (reportsByMonth.get(monthKey) ?? 0) + 1)
  })

  return {
    days: {
      label: "Ultimos 7 dias",
      data: days.map((day) => ({
        week: day.week,
        reports: reportsByDay.get(day.key) ?? 0,
      })),
    },
    weeks: {
      label: "Ultimas 8 semanas",
      data: weeks.map((week) => ({
        week: week.week,
        reports: reportsByWeek.get(week.key) ?? 0,
      })),
    },
    months: {
      label: "Ultimos 6 meses",
      data: months.map((month) => ({
        week: month.week,
        reports: reportsByMonth.get(month.key) ?? 0,
      })),
    },
  }
}

function collectConnectedCampaigns(
  clients: ClientWithCampaigns[],
  reports: RecentReport[]
) {
  const campaigns = new Map<string, { isActive: boolean }>()

  clients.forEach((client) => {
    client.campaigns.forEach((campaign) => {
      const key = campaign.campaignIdMeta || `${client.id}:${campaign.campaignName}`
      campaigns.set(key, { isActive: campaign.isActive })
    })
  })

  reports.forEach((report) => {
    const payload = parseStoredReportPayload(report.payloadJson)

    payload?.campaigns.forEach((campaign) => {
      const id = campaign.id?.trim()
      const name = campaign.name?.trim()
      const key = id || (name ? `${report.client.id}:${name}` : "")

      if (!key) {
        return
      }

      campaigns.set(key, {
        isActive: campaign.status === "ACTIVE",
      })
    })
  })

  return {
    total: campaigns.size,
    active: [...campaigns.values()].filter((campaign) => campaign.isActive).length,
  }
}

export async function getDashboardData(): Promise<DashboardData> {
  const user = await getCurrentUser()

  if (!user) {
    return buildEmptyDashboardData()
  }

  const currentMonthStart = startOfMonth(new Date())
  const firstMonthStart = new Date(currentMonthStart)
  firstMonthStart.setMonth(currentMonthStart.getMonth() - (MONTHS_TO_SHOW - 1))

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const reportScopeWhere: Prisma.ReportWhereInput = isAdmin(user)
    ? {}
    : {
        client: {
          managerId: user.id,
        },
      }

  const [clients, weeklyReports, recentReports] = await Promise.all([
    prisma.client.findMany({
      where: scopeClientWhere(user),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        adAccountId: true,
        createdAt: true,
        campaigns: {
          select: {
            campaignIdMeta: true,
            campaignName: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.report.findMany({
      where: {
        ...reportScopeWhere,
        generatedAt: {
          gte: firstMonthStart,
        },
      },
      select: {
        generatedAt: true,
        status: true,
      },
    }),
    prisma.report.findMany({
      where: reportScopeWhere,
      orderBy: { generatedAt: "desc" },
      take: 100,
      select: {
        id: true,
        generatedAt: true,
        status: true,
        payloadJson: true,
        client: {
          select: {
            id: true,
            name: true,
            status: true,
            adAccountId: true,
            createdAt: true,
            campaigns: {
              select: {
                campaignIdMeta: true,
                campaignName: true,
                isActive: true,
              },
            },
          },
        },
      },
    }),
  ])

  const activeClients = clients.filter((client) => client.status === "ACTIVE").length
  const connectedClients = clients.filter((client) => Boolean(client.adAccountId)).length
  const connectedCampaigns = collectConnectedCampaigns(clients, recentReports)
  const reportsLast7Days = weeklyReports.filter(
    (report) => report.generatedAt >= sevenDaysAgo
  ).length
  const failedReportsLast30Days = weeklyReports.filter(
    (report) => report.status === "FAILED" && report.generatedAt >= thirtyDaysAgo
  ).length

  return {
    stats: [
      {
        key: "activeClients",
        label: "Clientes ativos",
        value: activeClients.toString(),
        sub: `${connectedClients} com Meta conectada`,
      },
      {
        key: "connectedCampaigns",
        label: "Campanhas conectadas",
        value: connectedCampaigns.total.toString(),
        sub: `${connectedCampaigns.active} ativas`,
      },
      {
        key: "reportsGenerated",
        label: "Relatorios gerados",
        value: reportsLast7Days.toString(),
        sub: "ultimos 7 dias",
      },
      {
        key: "failedReports",
        label: "Falhas no envio",
        value: failedReportsLast30Days.toString(),
        sub: "ultimos 30 dias",
        valueColor: "text-red-500",
        subColor: "text-red-400",
      },
    ],
    chart: buildChartData(weeklyReports),
    recentActivity:
      recentReports.length > 0
        ? buildRecentActivityFromReports(recentReports)
        : buildRecentActivityFromClients(clients),
  }
}
