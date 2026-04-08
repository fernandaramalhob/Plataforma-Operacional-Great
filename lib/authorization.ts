import type { Prisma, User } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { getSessionUser } from "@/lib/session-user"
import { logError, logInfo, logWarn } from "@/lib/safe-logger"

type Role = "ADMIN" | "MANAGER"

export type AuthenticatedUser = Pick<
  User,
  "id" | "email" | "role" | "passwordHash" | "metaAccessToken" | "metaTokenExpiresAt"
>

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const { session, user } = await getSessionUser({
      id: true,
      email: true,
      role: true,
      passwordHash: true,
      metaAccessToken: true,
      metaTokenExpiresAt: true,
    })

    if (!session?.user?.email) {
      logWarn("auth.current-user.no-session")
      return null
    }

    logInfo("auth.current-user.loaded", {
      email: session.user.email,
      found: Boolean(user),
      userId: user?.id ?? null,
      role: user?.role ?? null,
    })

    return user
  } catch (error) {
    logError("auth.current-user.failed", error)
    throw error
  }
}

export function isAdmin(userOrRole: Pick<AuthenticatedUser, "role"> | Role) {
  const role = typeof userOrRole === "string" ? userOrRole : userOrRole.role

  return role === "ADMIN"
}

export function getRoleLabel(role: Role) {
  return role === "ADMIN" ? "Administrador" : "Gestor"
}

export function canAccessClient(
  user: Pick<AuthenticatedUser, "id" | "role">,
  managerId: string | null
) {
  return isAdmin(user) || managerId === user.id
}

export function canManageUserProfile(
  user: Pick<AuthenticatedUser, "role">,
  target: Pick<User, "role">
) {
  return isAdmin(user) && target.role === "MANAGER"
}

export function scopeClientWhere(
  user: Pick<AuthenticatedUser, "id" | "role">,
  where: Prisma.ClientWhereInput = {}
): Prisma.ClientWhereInput {
  if (isAdmin(user)) {
    return where
  }

  return {
    AND: [where, { managerId: user.id }],
  }
}
