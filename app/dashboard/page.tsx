import { unstable_noStore as noStore } from "next/cache"
import { Header } from "@/components/layout/header"
import { ClientSendStatus } from "@/components/dashboard/client-send-status"
import { ClientSetupIndicators } from "@/components/dashboard/client-setup-indicators"
import { DashboardStats } from "@/components/dashboard/stats-card"
import { ReportsChart } from "@/components/dashboard/reports-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { getDashboardData } from "@/lib/dashboard"

type PageProps = {
  searchParams: Promise<{
    startDate?: string | string[]
    endDate?: string | string[]
  }>
}

function getDefaultRange() {
  const today = new Date()
  const weekStart = new Date(today)
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  weekStart.setDate(today.getDate() + diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(0, 0, 0, 0)

  return { weekStart, weekEnd }
}

function readSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function parseInputDate(value: string | undefined) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  const parsed = new Date(year, month - 1, day)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function resolveDashboardRange(params: {
  startDate?: string | string[]
  endDate?: string | string[]
}) {
  const defaultRange = getDefaultRange()
  const startDate =
    parseInputDate(readSingleValue(params.startDate)) ?? defaultRange.weekStart
  const endDate =
    parseInputDate(readSingleValue(params.endDate)) ?? defaultRange.weekEnd

  if (startDate.getTime() > endDate.getTime()) {
    return {
      startDate: defaultRange.weekStart,
      endDate: defaultRange.weekEnd,
    }
  }

  return { startDate, endDate }
}

export default async function DashboardPage({ searchParams }: PageProps) {
  noStore()
  const params = await searchParams
  const dateRange = resolveDashboardRange(params)
  const dashboardData = await getDashboardData({
    includeOperational: false,
    dateRange,
  })

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Visão geral da operação"
      />
      <div className="mx-auto max-w-[1480px] px-8 pb-10 pt-6">
        <div className="space-y-6">
          <DashboardStats stats={dashboardData.stats} />

          <div className="space-y-6">
            <ClientSendStatus items={dashboardData.clientSendStatus} />
            <ClientSetupIndicators data={dashboardData.configIndicators} />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.8fr)_420px]">
            <div>
              <ReportsChart data={dashboardData.chart} />
            </div>
            <div>
              <RecentActivity activities={dashboardData.recentActivity} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
