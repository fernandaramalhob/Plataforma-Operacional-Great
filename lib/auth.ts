import CredentialsProvider from "next-auth/providers/credentials"
import GoogleProvider from "next-auth/providers/google"
import { NextAuthOptions } from "next-auth"
import { Role } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { hashPassword, verifyPassword } from "@/lib/password"

type AuthUser = {
  id: string
  email: string
  name: string
  role: Role
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

async function getOrCreateBootstrapAdmin(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL ? normalizeEmail(process.env.ADMIN_EMAIL) : ""
  const adminPassword = process.env.ADMIN_PASSWORD ?? ""
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH ?? ""

  if (!adminEmail || email !== adminEmail) {
    return null
  }

  let isValidPassword = false

  if (adminPasswordHash) {
    isValidPassword = verifyPassword(password, adminPasswordHash)
  } else if (adminPassword) {
    isValidPassword = password === adminPassword
  }

  if (!isValidPassword) {
    return null
  }

  const passwordHash = adminPasswordHash || hashPassword(password)

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.email,
    role: user.role,
  } satisfies AuthUser
}

async function authorizeWithCredentials(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email)

  const bootstrapAdmin = await getOrCreateBootstrapAdmin(normalizedEmail, password)
  if (bootstrapAdmin) {
    return bootstrapAdmin
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user?.passwordHash) {
    return null
  }

  const isValidPassword = verifyPassword(password, user.passwordHash)
  if (!isValidPassword) {
    return null
  }

  return {
    id: user.id,
    email: user.email,
    name: user.email,
    role: user.role,
  } satisfies AuthUser
}

const providers = [
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
]

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  providers,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google" || !user.email) {
        return true
      }

      const email = normalizeEmail(user.email)

      const dbUser = await prisma.user.upsert({
        where: { email },
        update: {},
        create: {
          email,
          passwordHash: "",
          role: "MANAGER",
        },
      })

      user.id = dbUser.id
      user.role = dbUser.role
      user.email = dbUser.email
      user.name = user.name ?? dbUser.email

      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.email = user.email
        token.name = user.name
      }

      if (typeof token.email === "string" && (!token.id || !token.role)) {
        const dbUser = await prisma.user.findUnique({
          where: { email: normalizeEmail(token.email) },
        })

        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
          token.email = dbUser.email
          token.name = typeof token.name === "string" && token.name ? token.name : dbUser.email
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === "string" ? token.id : ""
        session.user.role = token.role === "ADMIN" || token.role === "MANAGER"
          ? token.role
          : "MANAGER"
        session.user.email = typeof token.email === "string" ? token.email : session.user.email
        session.user.name = typeof token.name === "string" ? token.name : session.user.name
      }

      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
