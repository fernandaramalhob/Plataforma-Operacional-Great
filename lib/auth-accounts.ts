import { getAdminBootstrapCredentials } from "@/lib/admin-user"
import { hashPassword, verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

export type AuthRole = "ADMIN" | "MANAGER"

export type AuthLoginAccount = {
  id: string
  name: string
  email: string
  role: AuthRole
  password: string
}

export const DEFAULT_LOGIN_PASSWORD = "123456"

function readEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : ""
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function getManagerLoginAccounts(): AuthLoginAccount[] {
  return [
    {
      id: "manager-default",
      name: readEnvValue(process.env.DEV_BYPASS_AUTH_NAME) || "Isaque Soares",
      email:
        readEnvValue(process.env.DEV_BYPASS_AUTH_EMAIL) ||
        "pedrojuan.mwdigital@gmail.com",
      role: "MANAGER",
      password: DEFAULT_LOGIN_PASSWORD,
    },
    {
      id: "brayton-maycon",
      name: "Brayton Maycon",
      email: "braytonmaycon5@gmail.com",
      role: "MANAGER",
      password: DEFAULT_LOGIN_PASSWORD,
    },
  ]
}

export function getAuthLoginAccounts(): AuthLoginAccount[] {
  const adminCredentials = getAdminBootstrapCredentials()

  const accounts: AuthLoginAccount[] = [
    {
      id: "admin",
      name: adminCredentials?.name ?? "Administrador",
      email: adminCredentials?.email ?? "admin@greatgo.com",
      role: "ADMIN",
      password: adminCredentials?.password ?? DEFAULT_LOGIN_PASSWORD,
    },
    ...getManagerLoginAccounts(),
  ]

  return accounts.filter((account, index, current) => {
    return (
      current.findIndex(
        (entry) => normalizeEmail(entry.email) === normalizeEmail(account.email)
      ) === index
    )
  })
}

export function getBootstrapLoginAccount(email: string) {
  const normalizedEmail = normalizeEmail(email)

  return (
    getAuthLoginAccounts().find(
      (account) => normalizeEmail(account.email) === normalizedEmail
    ) ?? null
  )
}

export async function ensureBootstrapLoginAccount(email: string) {
  const account = getBootstrapLoginAccount(email)

  if (!account) {
    return null
  }

  if (account.role === "ADMIN") {
    const { ensureAdminUser } = await import("@/lib/admin-user")
    return ensureAdminUser()
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizeEmail(account.email) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  })

  if (
    existingUser?.role === account.role &&
    existingUser.passwordHash &&
    verifyPassword(account.password, existingUser.passwordHash)
  ) {
    return existingUser
  }

  const passwordHash = hashPassword(account.password)

  return prisma.user.upsert({
    where: { email: normalizeEmail(account.email) },
    update: {
      name: account.name,
      passwordHash,
      role: account.role,
    },
    create: {
      email: normalizeEmail(account.email),
      name: account.name,
      passwordHash,
      role: account.role,
    },
  })
}
