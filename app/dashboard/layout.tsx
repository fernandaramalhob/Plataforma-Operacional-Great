import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { Sidebar } from "@/components/layout/sidebar"
import { authOptions } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#F8FAFC" }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: "280px" }}>
        {children}
      </main>
    </div>
  )
}
