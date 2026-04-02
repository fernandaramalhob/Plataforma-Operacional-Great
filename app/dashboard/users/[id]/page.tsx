import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { ManagedUserProfilePage } from "@/components/users/managed-user-profile-page"
import { authOptions } from "@/lib/auth"

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect("/login")
  }

  if (session.user.role !== "ADMIN") {
    redirect("/dashboard")
  }

  const { id } = await params

  return <ManagedUserProfilePage userId={id} />
}
