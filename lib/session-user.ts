import { getServerSession } from "next-auth"
import type { Prisma } from "@prisma/client"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function findUserForSession<T extends Prisma.UserSelect>(params: {
  sessionUser: Session["user"] | undefined
  select: T
}) {
  const sessionUser = params.sessionUser

  if (!sessionUser) {
    return null
  }

  const sessionUserId =
    typeof sessionUser.id === "string" && sessionUser.id.trim()
      ? sessionUser.id.trim()
      : ""
  const sessionUserEmail =
    typeof sessionUser.email === "string" && sessionUser.email.trim()
      ? normalizeEmail(sessionUser.email)
      : ""

  if (sessionUserId) {
    const userById = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: params.select,
    })

    if (userById) {
      return userById
    }
  }

  if (!sessionUserEmail) {
    return null
  }

  return prisma.user.findUnique({
    where: { email: sessionUserEmail },
    select: params.select,
  })
}

export async function getSessionUser<T extends Prisma.UserSelect>(select: T) {
  const { authOptions } = await import("@/lib/auth")
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return {
      session: null,
      user: null,
    }
  }

  const user = await findUserForSession({
    sessionUser: session.user,
    select,
  })

  return {
    session,
    user,
  }
}
