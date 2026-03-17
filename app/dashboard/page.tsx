"use client"

import { Header } from "@/components/layout/header"
import { DashboardStats } from "@/components/dashboard/stats-card"
import { ReportsChart } from "@/components/dashboard/reports-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"

export default function DashboardPage() {
  return (
    <>
      <Header
        title="Dashboard"
        subtitle="Visão geral da operação · semana atual"
      />
      <div className="p-8 space-y-6">
        <DashboardStats />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ReportsChart />
          </div>
          <div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </>
  )
}