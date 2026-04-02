"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"

const SIDEBAR_WIDTH = 280
const SIDEBAR_COLLAPSED_WIDTH = 88

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "var(--color-app-background)",
        color: "var(--color-app-text)",
      }}
    >
      <Sidebar
        collapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed((current) => !current)}
      />
      <main
        style={{
          flex: 1,
          marginLeft: isSidebarCollapsed ? `${SIDEBAR_COLLAPSED_WIDTH}px` : `${SIDEBAR_WIDTH}px`,
          transition: "margin-left 200ms ease",
        }}
      >
        {children}
      </main>
    </div>
  )
}
