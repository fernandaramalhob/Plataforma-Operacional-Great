import { Header } from "@/components/layout/header"
import { DashboardStats } from "@/components/dashboard/stats-card"
import { ReportsChart } from "@/components/dashboard/reports-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { getDashboardData } from "@/lib/dashboard"

export default async function DashboardPage() {
  const dashboardData = await getDashboardData()

  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Visao geral da operacao"
      />
      <div className="p-8 space-y-6">
        <DashboardStats stats={dashboardData.stats} />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ReportsChart data={dashboardData.chart} />
          </div>
          <div>
            <RecentActivity activities={dashboardData.recentActivity} />
          </div>
        </div>
      </div>
    </>
  )
}
