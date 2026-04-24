"use client"

import { useEffect } from "react"

const SWEEP_INTERVAL_MS = 30_000

export function ReportScheduleAutoSweep() {
  useEffect(() => {
    let cancelled = false

    async function sweep() {
      try {
        await fetch("/api/jobs/health", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        })
      } catch {
        if (!cancelled) {
          // Silent fallback: the next interval will try again.
        }
      }
    }

    void sweep()
    const interval = window.setInterval(() => {
      void sweep()
    }, SWEEP_INTERVAL_MS)

    const onFocus = () => {
      void sweep()
    }

    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  return null
}
