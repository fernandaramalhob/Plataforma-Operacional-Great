import { Header } from "@/components/layout/header"
import { ClientSendStatus } from "@/components/dashboard/client-send-status"
import { ClientSetupIndicators } from "@/components/dashboard/client-setup-indicators"
import { OperationalPanel } from "@/components/dashboard/operational-panel"
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
      <div className="mx-auto max-w-[1480px] px-8 pb-10 pt-6">
        <div className="space-y-6">
          <DashboardStats stats={dashboardData.stats} />
          <OperationalPanel data={dashboardData.operational} />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div>
              <ClientSendStatus items={dashboardData.clientSendStatus} />
            </div>
            <div>
              <ClientSetupIndicators data={dashboardData.configIndicators} />
            </div>
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
