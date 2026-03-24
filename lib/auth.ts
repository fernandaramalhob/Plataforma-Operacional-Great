import CredentialsProvider from "next-auth/providers/credentials"
import { NextAuthOptions } from "next-auth"
import {
  ensureAdminUser,
} from "@/lib/admin-user"
import { prisma } from "@/lib/prisma"
import { verifyPassword } from "@/lib/password"

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

async function authorizeWithCredentials(email: string, password: string) {
  await ensureAdminUser()
  const normalizedEmail = normalizeEmail(email)
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      passwordHash: true,
    },
  })

  if (!user) {
    return null
  }

  const isValidPassword = verifyPassword(password, user.passwordHash)

  if (!isValidPassword) {
    return null
  }

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
          return null
        }

        return authorizeWithCredentials(email, password)
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
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
        return token
      }

      const tokenEmail = typeof token.email === "string" ? normalizeEmail(token.email) : ""

      if (!tokenEmail) {
        delete token.id
        delete token.role
        delete token.email
        delete token.name
        return token
      }

      const dbUser = await prisma.user.findUnique({
        where: { email: tokenEmail },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      })

      if (!dbUser) {
        delete token.id
        delete token.role
        delete token.email
        delete token.name
        return token
      }

      token.id = dbUser.id
      token.email = dbUser.email
      token.name = dbUser.name ?? dbUser.email
      token.role = dbUser.role

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.role = token.role === "ADMIN" ? "ADMIN" : "MANAGER"
        session.user.email = typeof token.email === "string" ? token.email : ""
        session.user.name = typeof token.name === "string" ? token.name : ""
      }

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
