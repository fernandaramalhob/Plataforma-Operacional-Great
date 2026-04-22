import CredentialsProvider from "next-auth/providers/credentials"
import type { NextAuthOptions } from "next-auth"
import {
  ensureBootstrapLoginAccount,
  getBootstrapLoginAccount,
} from "@/lib/auth-accounts"
import { withTimeout } from "@/lib/async"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"
import { logError, logInfo, logWarn } from "@/lib/safe-logger"

type Role = "ADMIN" | "MANAGER"

type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function findUserByNormalizedEmail(email: string) {
  const normalizedEmail = normalizeEmail(email)

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  })

  return (
    users.find(
      (user) => normalizeEmail(user.email) === normalizedEmail
    ) ?? null
  )
}

async function authorizeWithCredentials(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)
  const bootstrapAccount = getBootstrapLoginAccount(normalizedEmail)

  logInfo("auth.authorize.start", {
    email: normalizedEmail,
    bootstrapAccount: bootstrapAccount?.id ?? null,
  })

  if (bootstrapAccount) {
    logInfo("auth.authorize.bootstrap-account.start", {
      email: normalizedEmail,
      accountId: bootstrapAccount.id,
    })
    await withTimeout(
      ensureBootstrapLoginAccount(normalizedEmail),
      8_000,
      "Tempo esgotado ao preparar a conta de acesso."
    )
    logInfo("auth.authorize.bootstrap-account.done", {
      email: normalizedEmail,
      accountId: bootstrapAccount.id,
    })
  }

  const user = await findUserByNormalizedEmail(normalizedEmail)

  if (!user) {
    logWarn("auth.authorize.user-not-found", {
      email: normalizedEmail,
    })
    return null
  }

  const isValidPassword = verifyPassword(password, user.passwordHash)

  if (!isValidPassword) {
    logWarn("auth.authorize.invalid-password", {
      email: normalizedEmail,
      userId: user.id,
    })
    return null
  }

  logInfo("auth.authorize.success", {
    email: normalizedEmail,
    userId: user.id,
    role: user.role,
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
  } satisfies AuthUser
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim()
        const password = credentials?.password

        if (!email || !password) {
          logWarn("auth.authorize.missing-credentials")
          return null
        }

        try {
          return await withTimeout(
            authorizeWithCredentials(email, password),
            12_000,
            "Tempo esgotado ao validar as credenciais."
          )
        } catch (error) {
          logError("auth.authorize.failed", error, {
            email,
          })
          throw error
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        logInfo("auth.jwt.user-attached", {
          userId: user.id,
          email: user.email,
          role: user.role,
        })
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
        return token
      }

      if (typeof token.email !== "string" || !token.email.trim()) {
        delete token.id
        delete token.role
        delete token.email
        delete token.name
        logWarn("auth.jwt.missing-email")
        return token
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "MANAGER"
        session.user.email = typeof token.email === "string" ? token.email : ""
        session.user.name = typeof token.name === "string" ? token.name : ""
      }

      logInfo("auth.session.ready", {
        hasUser: Boolean(session.user?.email),
        userId: session.user?.id,
        role: session.user?.role,
      })

      return session
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) {
        const destination = `${baseUrl}${url}`
        logInfo("auth.redirect.relative", { destination })
        return destination
      }

      try {
        const targetUrl = new URL(url)
        if (targetUrl.origin === baseUrl) {
          logInfo("auth.redirect.same-origin", {
            destination: targetUrl.toString(),
          })
          return targetUrl.toString()
        }
      } catch {
        logWarn("auth.redirect.invalid-url", { url, baseUrl })
      }

      logWarn("auth.redirect.fallback", { url, baseUrl })
      return `${baseUrl}/dashboard`
    },
  },
  events: {
    async signIn(message) {
      logInfo("auth.event.sign-in", {
        isNewUser: message.isNewUser,
        userId: message.user.id,
        email: message.user.email,
      })
    },
    async signOut(message) {
      logInfo("auth.event.sign-out", {
        session: typeof message.session === "object" ? "present" : "missing",
        tokenEmail:
          typeof message.token?.email === "string" ? message.token.email : null,
      })
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
