import { hashPassword, verifyPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"

export const ADMIN_ROLE = "ADMIN" as const
export const ADMIN_NAME = "Administrador"
export const ADMIN_EMAIL = "admin@greatgo.com"
const ADMIN_PASSWORD = "Great2026!"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isAdminEmail(email: string) {
  return normalizeEmail(email) === ADMIN_EMAIL
}

export async function ensureAdminUser() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
  })

  if (
    existingAdmin?.role === ADMIN_ROLE &&
    existingAdmin.passwordHash &&
    verifyPassword(ADMIN_PASSWORD, existingAdmin.passwordHash)
  ) {
    return existingAdmin
  }

  const passwordHash = hashPassword(ADMIN_PASSWORD)

  return prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: {
      passwordHash,
      role: ADMIN_ROLE,
    },
    create: {
      email: ADMIN_EMAIL,
      passwordHash,
      role: ADMIN_ROLE,
    },
  })
}
