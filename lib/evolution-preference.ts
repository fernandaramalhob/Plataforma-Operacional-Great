import { prisma } from "@/lib/prisma"

function normalizeInstanceName(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null
}

export async function resolveUserEvolutionInstance(userId: string | null | undefined) {
  if (!userId) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      evolutionInstance: true,
    },
  })

  return normalizeInstanceName(user?.evolutionInstance)
}

export function normalizeEvolutionInstancePreference(value: unknown) {
  return normalizeInstanceName(value)
}
