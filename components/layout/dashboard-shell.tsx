"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { ReportScheduleAutoSweep } from "@/components/layout/report-schedule-auto-sweep"

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 88

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div className="relative isolaté flex min-h-screen overflow-hidden bg-[var(--color-app-background)] text-[var(--color-app-text)]">
      <div className="pointer-events-none absolute -left-24 top-[-6rem] h-72 w-72 rounded-full bg-[rgba(193,18,31,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-7rem] top-1/3 h-80 w-80 rounded-full bg-[rgba(59,130,246,0.08)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-6rem] left-1/4 h-64 w-64 rounded-full bg-[rgba(15,23,42,0.06)] blur-3xl" />

      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main
        className="relative z-10 flex-1 transition-[margin-left] duration-200"
        style={{
          marginLeft: isSidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${SIDEBAR_WIDTH}px`,
        }}
      >
        <ReportScheduleAutoSweep />
        {children}
      </main>
    </div>
  )
}
