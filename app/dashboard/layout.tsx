import { DashboardShell } from "@/components/layout/dashboard-shell"
import Providers from "@/components/providers"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Providers>
      <DashboardShell>{children}</DashboardShell>
    </Providers>
  )
}
