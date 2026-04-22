import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: "ADMIN" | "MANAGER"
    } & DefaultSession["user"]
  }

  interface User {
    id: string
    role: "ADMIN" | "MANAGER"
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    role?: "ADMIN" | "MANAGER"
    email?: string | null
    name?: string | null
  }
}

export {}
