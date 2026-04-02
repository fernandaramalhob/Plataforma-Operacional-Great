import { hashPassword, verifyPassword } from "@/lib/password"

export const ADMIN_ROLE = "ADMIN" as const
export const ADMIN_NAME = "Administrador"
export const DEFAULT_ADMIN_EMAIL = "admin@greatgo.com"

type AdminBootstrapCredentials = {
  email: string
  password: string
  name: string
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function readEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : ""
}

export function getAdminBootstrapCredentials(
  env: Record<string, string | undefined> = process.env
): AdminBootstrapCredentials | null {
  const email = normalizeEmail(
    readEnvValue(env.ADMIN_EMAIL)
      || readEnvValue(env.SEED_USER_EMAIL)
      || DEFAULT_ADMIN_EMAIL
  )
  const password =
    readEnvValue(env.ADMIN_PASSWORD) || readEnvValue(env.SEED_USER_PASSWORD)

  if (!password) {
    return null
  }

  return {
    email,
    password,
    name: ADMIN_NAME,
  }
}

export function isAdminEmail(email: string) {
  const adminCredentials = getAdminBootstrapCredentials()

  if (!adminCredentials) {
    return false
  }

  return normalizeEmail(email) === adminCredentials.email
}

export async function ensureAdminUser() {
  const adminCredentials = getAdminBootstrapCredentials()

  if (!adminCredentials) {
    return null
  }

  const { prisma } = await import("@/lib/prisma")
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminCredentials.email },
  })

  if (
    existingAdmin?.role === ADMIN_ROLE &&
    existingAdmin.passwordHash &&
    verifyPassword(adminCredentials.password, existingAdmin.passwordHash)
  ) {
    return existingAdmin
  }

  const passwordHash = hashPassword(adminCredentials.password)
  const userName = existingAdmin?.name ?? adminCredentials.name

  return prisma.user.upsert({
    where: { email: adminCredentials.email },
    update: {
      name: userName,
      passwordHash,
      role: ADMIN_ROLE,
    },
    create: {
      email: adminCredentials.email,
      name: userName,
      passwordHash,
      role: ADMIN_ROLE,
    },
  })
}
