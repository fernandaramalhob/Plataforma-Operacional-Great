import { unstable_noStore as noStore } from "next/cache"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import Providers from "@/components/providers"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { runDueReportScheduleSweep } from "@/lib/report-schedule-fallback"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  noStore()
  const user = await getCurrentUser()

  await runDueReportScheduleSweep({
    source: "dashboard-layout",
  })

  return (
    <Providers>
      <DashboardShell isAdmin={Boolean(user && isAdmin(user))}>
        {children}
      </DashboardShell>
    </Providers>
  )
}
