"use client"

import { useEffect, useRef, useState } from "react"
import { Sidebar } from "@/components/layout/sidebar"
import { ReportScheduleAutoSweep } from "@/components/layout/report-schedule-auto-sweep"

const SIDEBAR_MIN_WIDTH = 88
const SIDEBAR_MAX_WIDTH = 360
const SIDEBAR_DEFAULT_WIDTH = 292

type DashboardShellProps = {
  children: React.ReactNode
  isAdmin: boolean
}

export function DashboardShell({ children, isAdmin }: DashboardShellProps) {
  const [sidebarWidth, setSidebarWidth] = useState(SIDEBAR_DEFAULT_WIDTH)
  const resizingRef = useRef(false)

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      if (!resizingRef.current) {
        return
      }

      const nextWidth = Math.min(
        SIDEBAR_MAX_WIDTH,
        Math.max(SIDEBAR_MIN_WIDTH, event.clientX)
      )

      setSidebarWidth(nextWidth)
    }

    const handlePointerUp = () => {
      resizingRef.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", handlePointerUp)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", handlePointerUp)
    }
  }, [])

  function startResize() {
    resizingRef.current = true
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }

  return (
    <div className="relative isolate flex min-h-screen overflow-hidden bg-[var(--color-app-background)] text-[var(--color-app-text)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(223,37,49,0.08),transparent_24%),radial-gradient(circle_at_top_right,rgba(17,24,39,0.03),transparent_22%)]" />

      <Sidebar
        width={sidebarWidth}
        onResizeStart={startResize}
      />
      <main
        className="relative z-10 flex-1 transition-[margin-left] duration-300"
        style={{
          marginLeft: `${sidebarWidth}px`,
        }}
      >
        <ReportScheduleAutoSweep enabled={isAdmin} />
        {children}
      </main>
    </div>
  )
}
