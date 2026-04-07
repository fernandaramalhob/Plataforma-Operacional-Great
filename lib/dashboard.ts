import { Prisma, ReportStatus, SendLogStatus } from "@prisma/client"
import { getCurrentUser, isAdmin, scopeClientWhere } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { getReportQueuesHealth } from "@/lib/report-monitoring"

const DAYS_TO_SHOW = 7
const WEEKS_TO_SHOW = 8
const MONTHS_TO_SHOW = 6
const RECENT_ACTIVITY_LIMIT = 5
const CLIENT_SEND_STATUS_LIMIT = 8
const CONFIG_ISSUES_LIMIT = 6
const OPERATIONAL_ALERTS_LIMIT = 4

export type DashboardStatKey =
  | "sentReports"
  | "failedReports"
  | "pendingReports"

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

export type DashboardTone = "healthy" | "warning" | "critical" | "neutral"

export type DashboardOperationalMetric = {
  label: string
  value: string
  tone: DashboardTone
}

export type DashboardOperationalAlertItem = {
  id: string
  source: string
  message: string
  severity: "warning" | "error"
  createdAt: string | null
}

export type DashboardOperationalPanel = {
  mode: "admin" | "manager"
  title: string
  description: string
  tone: DashboardTone
  checkedAt: string | null
  metrics: DashboardOperationalMetric[]
  alerts: DashboardOperationalAlertItem[]
}

export type DashboardClientSendState =
  | "Enviado"
  | "Falha"
  | "Pendente"
  | "Nunca enviado"

export type DashboardClientSendItem = {
  id: string
  name: string
  company: string | null
  status: DashboardClientSendState
  time: string
  referenceWeek: string | null
  attempts: number
  errorMessage: string | null
}

export type DashboardConfigIssueItem = {
  id: string
  name: string
  company: string | null
  issues: string[]
}

export type DashboardConfigIndicators = {
  totalClients: number
  readyClients: number
  withoutMetaToken: number
  withoutWhatsappGroup: number
  clients: DashboardConfigIssueItem[]
}

export type DashboardData = {
  stats: DashboardStat[]
  chart: DashboardChartData
  recentActivity: DashboardRecentActivityItem[]
  operational: DashboardOperationalPanel
  clientSendStatus: DashboardClientSendItem[]
  configIndicators: DashboardConfigIndicators
}

type GetDashboardDataOptions = {
  includeOperational?: boolean
}

type ClientWithCampaigns = {
  id: string
  name: string
  company: string | null
  status: "ACTIVE" | "INACTIVE"
  adAccountId: string | null
  whatsappGroupId: string | null
  createdAt: Date
  managerId: string | null
  manager: {
    id: string
    metaAccessToken: string | null
  } | null
  campaigns: {
    campaignIdMeta: string
    campaignName: string
    isActive: boolean
  }[]
  reports: {
    id: string
    generatedAt: Date
    referenceWeek: Date
    status: ReportStatus
    sendLogs: {
      attemptNumber: number
      status: SendLogStatus
      sentAt: Date | null
      errorMessage: string | null
    }[]
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
        key: "sentReports",
        label: "Enviados",
        value: "0",
        sub: "últimos 30 dias",
        valueColor: "text-emerald-700",
        subColor: "text-emerald-600",
      },
      {
        key: "failedReports",
        label: "Falhas",
        value: "0",
        sub: "últimos 30 dias",
        valueColor: "text-red-500",
        subColor: "text-red-400",
      },
      {
        key: "pendingReports",
        label: "Pendentes",
        value: "0",
        sub: "últimos 30 dias",
        valueColor: "text-gray-700",
        subColor: "text-gray-500",
      },
    ],
    chart: buildChartData([]),
    recentActivity: [],
    operational: {
      mode: "manager",
      title: "Status operacional",
      description: "Entre para visualizar a saÃºde da operaÃ§Ã£o.",
      tone: "neutral",
      checkedAt: null,
      metrics: [],
      alerts: [],
    },
    clientSendStatus: [],
    configIndicators: {
      totalClients: 0,
      readyClients: 0,
      withoutMetaToken: 0,
      withoutWhatsappGroup: 0,
      clients: [],
    },
  }
}

function startOfWeek(date: Date) {
  const normalized = new Date(date)
  const daypfWeek = normalized.getDay()
  const diffToMonday = daypfWeek === 0 ? -6 : 1 - daypfWeek

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

function formatReferenceWeek(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
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
      label: "Ãšltimos 7 dias",
      data: days.map((day) => ({
        week: day.week,
        reports: reportsByDay.get(day.key) ?? 0,
      })),
    },
    weeks: {
      label: "Ãšltimas 8 semanas",
      data: weeks.map((week) => ({
        week: week.week,
        reports: reportsByWeek.get(week.key) ?? 0,
      })),
    },
    months: {
      label: "Ãšltimos 6 meses",
      data: months.map((month) => ({
        week: month.week,
        reports: reportsByMonth.get(month.key) ?? 0,
      })),
    },
  }
}

function resolveClientMetaTokenState(
  client: ClientWithCampaigns,
  fallbackMetaTokenAvailable: boolean
) {
  if (client.managerId) {
    return Boolean(client.manager?.metaAccessToken?.trim())
  }

  return fallbackMetaTokenAvailable
}

function buildConfigIndicators(
  clients: ClientWithCampaigns[],
  fallbackMetaTokenAvailable: boolean
): DashboardConfigIndicators {
  const activeClients = clients.filter((client) => client.status === "ACTIVE")
  const pendingClients: DashboardConfigIssueItem[] = []
  let withoutMetaToken = 0
  let withoutWhatsappGroup = 0
  let readyClients = 0

  activeClients.forEach((client) => {
    const issues: string[] = []
    const hasMetaToken = resolveClientMetaTokenState(
      client,
      fallbackMetaTokenAvailable
    )
    const hasWhatsappGroup = Boolean(client.whatsappGroupId?.trim())

    if (!hasMetaToken) {
      withoutMetaToken += 1
      issues.push("Sem token META do responsÃ¡vel")
    }

    if (!hasWhatsappGroup) {
      withoutWhatsappGroup += 1
      issues.push("Sem grupo de WhatsApp")
    }

    if (issues.length === 0) {
      readyClients += 1
      return
    }

    pendingClients.push({
      id: client.id,
      name: client.name,
      company: client.company,
      issues,
    })
  })

  return {
    totalClients: activeClients.length,
    readyClients,
    withoutMetaToken,
    withoutWhatsappGroup,
    clients: pendingClients
      .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
      .slice(0, CONFIG_ISSUES_LIMIT),
  }
}

function buildClientSendStatus(clients: ClientWithCampaigns[]) {
  const items = clients
    .map((client) => {
      const report = client.reports[0]
      const sendLog = report?.sendLogs[0]
      const activityDate = sendLog?.sentAt ?? report?.generatedAt ?? null
      const attempts = sendLog?.attemptNumber ?? 0
      let status: DashboardClientSendState = "Nunca enviado"
      let errorMessage: string | null = null

      if (sendLog?.status === "OK") {
        status = "Enviado"
      } else if (sendLog?.status === "FAILED" || report?.status === "FAILED") {
        status = "Falha"
        errorMessage = sendLog?.errorMessage ?? null
      } else if (report) {
        status = "Pendente"
      }

      return {
        id: client.id,
        name: client.name,
        company: client.company,
        status,
        time: activityDate ? formatRelativeTime(activityDate) : "Sem histÃ³rico",
        referenceWeek: report ? formatReferenceWeek(report.referenceWeek) : null,
        attempts,
        errorMessage,
        sortTime: activityDate?.getTime() ?? 0,
      }
    })
    .sort((left, right) => right.sortTime - left.sortTime)

  return items.slice(0, CLIENT_SEND_STATUS_LIMIT).map((item) => ({
    id: item.id,
    name: item.name,
    company: item.company,
    status: item.status,
    time: item.time,
    referenceWeek: item.referenceWeek,
    attempts: item.attempts,
    errorMessage: item.errorMessage,
  }))
}

function normalizeToneFromCounts(params: {
  errors: number
  warnings: number
}): DashboardTone {
  if (params.errors > 0) {
    return "critical"
  }

  if (params.warnings > 0) {
    return "warning"
  }

  return "healthy"
}

async function buildAdminOperationalPanel(): Promise<DashboardOperationalPanel> {
  try {
    const health = await getReportQueuesHealth()
    const failedGeneration = health.queues.generation.failed ?? 0
    const failedSend = health.queues.send.failed ?? 0
    const deadLetters =
      (health.queues.deadLetter.waiting ?? 0) + (health.queues.deadLetter.delayed ?? 0)
    const warningAlerts = [...health.alerts, ...health.integrationAlerts].filter(
      (alert) => alert.severity === "warning"
    ).length
    const errorAlerts = [...health.alerts, ...health.integrationAlerts].filter(
      (alert) => alert.severity === "error"
    ).length
    const tone = normalizeToneFromCounts({
      errors: errorAlerts + deadLetters,
      warnings: warningAlerts,
    })
    const alerts = [...health.integrationAlerts, ...health.alerts]
      .sort((left, right) => {
        const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0
        const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0
        return rightTime - leftTime
      })
      .slice(0, OPERATIONAL_ALERTS_LIMIT)
      .map((alert) => ({
        id: alert.id,
        source:
          "integration" in alert
            ? `IntegraÃ§Ã£o ${alert.integration}`
            : `Fila ${alert.queueName ?? alert.source}`,
        message: alert.message,
        severity: alert.severity,
        createdAt: alert.createdAt ?? null,
      }))

    return {
      mode: "admin",
      title:
        tone === "critical"
          ? "OperaÃ§Ã£o requer atenÃ§Ã£o imediata"
          : tone === "warning"
            ? "OperaÃ§Ã£o com pontos de atenÃ§Ã£o"
            : "OperaÃ§Ã£o estÃ¡vel",
      description: health.ok
        ? "Filas, agendamento e integraÃ§Ãµes estÃ£o respondendo dentro do esperado."
        : "Existem alertas recentes ou filas pendentes exigindo acompanhamento.",
      tone,
      checkedAt: health.checkedAt,
      metrics: [
        {
          label: "Fila de geraÃ§Ã£o",
          value: `${health.queues.generation.waiting ?? 0} aguardando / ${failedGeneration} falhas`,
          tone: failedGeneration > 0 ? "critical" : "healthy",
        },
        {
          label: "Fila de envio",
          value: `${health.queues.send.waiting ?? 0} aguardando / ${failedSend} falhas`,
          tone: failedSend > 0 ? "critical" : "healthy",
        },
        {
          label: "Fila de falhas",
          value: `${deadLetters} pendente(s)`,
          tone: deadLetters > 0 ? "critical" : "healthy",
        },
        {
          label: "Alertas ativos",
          value: `${errorAlerts} crÃ­ticos / ${warningAlerts} avisos`,
          tone: normalizeToneFromCounts({
            errors: errorAlerts,
            warnings: warningAlerts,
          }),
        },
      ],
      alerts,
    }
  } catch (error) {
    return {
      mode: "admin",
      title: "NÃ£o foi possÃ­vel verificar a saÃºde operacional",
      description:
        error instanceof Error
          ? error.message
          : "Falha ao carregar o painel operacional.",
      tone: "warning",
      checkedAt: new Date().toISOString(),
      metrics: [
        {
          label: "Painel operacional",
          value: "IndisponÃ­vel",
          tone: "warning",
        },
      ],
      alerts: [
        {
          id: "operational-health-unavailable",
          source: "Sistema",
          message: "O health check dos jobs nÃ£o respondeu nesta consulta.",
          severity: "warning",
          createdAt: new Date().toISOString(),
        },
      ],
    }
  }
}

function buildManagerOperationalPanel(params: {
  configIndicators: DashboardConfigIndicators
  failedReportsLast30Days: number
}): DashboardOperationalPanel {
  const { configIndicators, failedReportsLast30Days } = params
  const tone = normalizeToneFromCounts({
    errors: failedReportsLast30Days,
    warnings:
      configIndicators.withoutMetaToken + configIndicators.withoutWhatsappGroup,
  })
  const alerts: DashboardOperationalAlertItem[] = [
    ...configIndicators.clients.slice(0, 2).map((client) => ({
      id: `${client.id}-config`,
      source: client.name,
      message: client.issues.join(" Â· "),
      severity: "warning" as const,
      createdAt: null,
    })),
  ]

  if (failedReportsLast30Days > 0) {
    alerts.unshift({
      id: "failed-reports-30d",
      source: "Envios",
      message: `${failedReportsLast30Days} relatÃ³rio(s) falharam nos Ãºltimos 30 dias.`,
      severity: "error",
      createdAt: null,
    })
  }

  return {
    mode: "manager",
    title:
      tone === "critical"
        ? "Sua carteira precisa de acompanhamento"
        : tone === "warning"
          ? "Sua carteira tem pendÃªncias operacionais"
          : "Sua carteira estÃ¡ pronta para operar",
    description:
      configIndicators.readyClients > 0
        ? `${configIndicators.readyClients} cliente(s) estÃ£o prontos para gerar e enviar relatÃ³rios.`
        : "Ajuste token META e grupos de WhatsApp para liberar os envios.",
    tone,
    checkedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Clientes prontos",
        value: `${configIndicators.readyClients}/${configIndicators.totalClients}`,
        tone: configIndicators.readyClients > 0 ? "healthy" : "warning",
      },
      {
        label: "Sem token META",
        value: configIndicators.withoutMetaToken.toString(),
        tone: configIndicators.withoutMetaToken > 0 ? "warning" : "healthy",
      },
      {
        label: "Sem grupo WhatsApp",
        value: configIndicators.withoutWhatsappGroup.toString(),
        tone:
          configIndicators.withoutWhatsappGroup > 0 ? "warning" : "healthy",
      },
      {
        label: "Falhas 30 dias",
        value: failedReportsLast30Days.toString(),
        tone: failedReportsLast30Days > 0 ? "critical" : "healthy",
      },
    ],
    alerts: alerts.slice(0, OPERATIONAL_ALERTS_LIMIT),
  }
}

function buildLightOperationalPanel(params: {
  isAdminMode: boolean
  configIndicators: DashboardConfigIndicators
  failedReportsLast30Days: number
}): DashboardOperationalPanel {
  if (!params.isAdminMode) {
    return buildManagerOperationalPanel({
      configIndicators: params.configIndicators,
      failedReportsLast30Days: params.failedReportsLast30Days,
    })
  }

  const tone = normalizeToneFromCounts({
    errors: params.failedReportsLast30Days,
    warnings:
      params.configIndicators.withoutMetaToken
      + params.configIndicators.withoutWhatsappGroup,
  })

  return {
    mode: "admin",
    title:
      tone === "critical"
        ? "OperaÃ§Ã£o requer atenÃ§Ã£o"
        : tone === "warning"
          ? "OperaÃ§Ã£o com pontos de atenÃ§Ã£o"
          : "OperaÃ§Ã£o estÃ¡vel",
    description:
      "Resumo leve carregado sem consultar filas externas. Ative o painel operacional completo apenas quando ele for exibido.",
    tone,
    checkedAt: new Date().toISOString(),
    metrics: [
      {
        label: "Clientes prontos",
        value: `${params.configIndicators.readyClients}/${params.configIndicators.totalClients}`,
        tone: params.configIndicators.readyClients > 0 ? "healthy" : "warning",
      },
      {
        label: "Sem token META",
        value: params.configIndicators.withoutMetaToken.toString(),
        tone:
          params.configIndicators.withoutMetaToken > 0 ? "warning" : "healthy",
      },
      {
        label: "Sem grupo WhatsApp",
        value: params.configIndicators.withoutWhatsappGroup.toString(),
        tone:
          params.configIndicators.withoutWhatsappGroup > 0 ? "warning" : "healthy",
      },
      {
        label: "Falhas 30 dias",
        value: params.failedReportsLast30Days.toString(),
        tone: params.failedReportsLast30Days > 0 ? "critical" : "healthy",
      },
    ],
    alerts: [],
  }
}

export async function getDashboardData(
  options: GetDashboardDataOptions = {}
): Promise<DashboardData> {
  const user = await getCurrentUser()

  if (!user) {
    return buildEmptyDashboardData()
  }

  const currentMonthStart = startOfMonth(new Date())
  const firstMonthStart = new Date(currentMonthStart)
  firstMonthStart.setMonth(currentMonthStart.getMonth() - (MONTHS_TO_SHOW - 1))

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const reportScopeWhere: Prisma.ReportWhereInput = isAdmin(user)
    ? {}
    : {
        client: {
          managerId: user.id,
        },
      }

  const adminFallbackTokenPromise = isAdmin(user)
    ? prisma.user.findFirst({
        where: {
          role: "ADMIN",
          metaAccessToken: {
            not: null,
          },
        },
        select: {
          id: true,
        },
      })
    : Promise.resolve(user.metaAccessToken ? { id: user.id } : null)

  const [clients, weeklyReports, recentReports, reportStatusGroups, adminFallbackToken] = await Promise.all([
    prisma.client.findMany({
      where: scopeClientWhere(user),
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        company: true,
        status: true,
        adAccountId: true,
        whatsappGroupId: true,
        createdAt: true,
        managerId: true,
        manager: {
          select: {
            id: true,
            metaAccessToken: true,
          },
        },
        campaigns: {
          select: {
            campaignIdMeta: true,
            campaignName: true,
            isActive: true,
          },
        },
        reports: {
          orderBy: {
            generatedAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            generatedAt: true,
            referenceWeek: true,
            status: true,
            sendLogs: {
              orderBy: {
                attemptNumber: "desc",
              },
              take: 1,
              select: {
                attemptNumber: true,
                status: true,
                sentAt: true,
                errorMessage: true,
              },
            },
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
            company: true,
            status: true,
            adAccountId: true,
            whatsappGroupId: true,
            createdAt: true,
            managerId: true,
            manager: {
              select: {
                id: true,
                metaAccessToken: true,
              },
            },
            campaigns: {
              select: {
                campaignIdMeta: true,
                campaignName: true,
                isActive: true,
              },
            },
            reports: {
              orderBy: {
                generatedAt: "desc",
              },
              take: 1,
              select: {
                id: true,
                generatedAt: true,
                referenceWeek: true,
                status: true,
                sendLogs: {
                  orderBy: {
                    attemptNumber: "desc",
                  },
                  take: 1,
                  select: {
                    attemptNumber: true,
                    status: true,
                    sentAt: true,
                    errorMessage: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.report.groupBy({
      by: ["status"],
      where: {
        ...reportScopeWhere,
        generatedAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        _all: true,
      },
    }),
    adminFallbackTokenPromise,
  ])

  const reportStatusCounts = reportStatusGroups.reduce<Record<ReportStatus, number>>(
    (accumulator, group) => {
      accumulator[group.status] = group._count._all
      return accumulator
    },
    {
      PENDING: 0,
      SENT: 0,
      FAILED: 0,
    }
  )
  const sentReportsLast30Days = reportStatusCounts.SENT
  const pendingReportsLast30Days = reportStatusCounts.PENDING
  const failedReportsLast30Days = reportStatusCounts.FAILED
  const fallbackMetaTokenAvailable = Boolean(adminFallbackToken)
  const configIndicators = buildConfigIndicators(
    clients,
    fallbackMetaTokenAvailable
  )
  const shouldIncludeOperational = options.includeOperational === true
  const operational =
    shouldIncludeOperational && isAdmin(user)
      ? await buildAdminOperationalPanel()
      : buildLightOperationalPanel({
          isAdminMode: isAdmin(user),
          configIndicators,
          failedReportsLast30Days,
        })
  return {
    stats: [
      {
        key: "sentReports",
        label: "Enviados",
        value: sentReportsLast30Days.toString(),
        sub: "últimos 30 dias",
        valueColor: "text-emerald-700",
        subColor: "text-emerald-600",
      },
      {
        key: "failedReports",
        label: "Falhas",
        value: failedReportsLast30Days.toString(),
        sub: "últimos 30 dias",
        valueColor: "text-red-500",
        subColor: "text-red-400",
      },
      {
        key: "pendingReports",
        label: "Pendentes",
        value: pendingReportsLast30Days.toString(),
        sub: "últimos 30 dias",
        valueColor: "text-gray-700",
        subColor: "text-gray-500",
      },
    ],
    chart: buildChartData(weeklyReports),
    recentActivity:
      recentReports.length > 0
        ? buildRecentActivityFromReports(recentReports)
        : buildRecentActivityFromClients(clients),
    operational,
    clientSendStatus: buildClientSendStatus(clients),
    configIndicators,
  }
}
