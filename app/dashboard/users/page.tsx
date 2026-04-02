import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { UsersManagementPage } from "@/components/users/users-management-page"
import { authOptions } from "@/lib/auth"

export default async function UsersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  return <UsersManagementPage />
}
