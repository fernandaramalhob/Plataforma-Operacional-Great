import { unstable_noStore as noStore } from "next/cache"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import Providers from "@/components/providers"
import { runDueReportScheduleSweep } from "@/lib/report-schedule-fallback"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  noStore()
  await runDueReportScheduleSweep({
    source: "dashboard-layout",
  })

  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  )
}
