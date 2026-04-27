import { NextResponse } from "next/server"
import { encode } from "next-auth/jwt"
import { ensureBootstrapLoginAccount } from "@/lib/auth-accounts"
import { getAuthSecret } from "@/lib/auth-secret"

export const runtime = "nodejs"

type TestLoginBody = {
  email?: string
  name?: string
  role?: "ADMIN" | "MANAGER"
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function POST(request: Request) {
  const secret = getAuthSecret()

  if (!secret) {
    return NextResponse.json(
      { error: "NEXTAUTH_SECRET ausente" },
      { status: 500 }
    )
  }

  const body = (await request.json().catch(() => ({}))) as TestLoginBody
  const email = normalizeEmail(body.email ?? "admin@greatgo.com")
  const account = await ensureBootstrapLoginAccount(email)

  if (!account) {
    return NextResponse.json(
      { error: "Conta de teste indisponível" },
      { status: 404 }
    )
  }

  const token = await encode({
    secret,
    maxAge: 60 * 60 * 24 * 30,
    token: {
      sub: account.id,
      id: account.id,
      email: account.email,
      name: body.name ?? account.name,
      role: body.role ?? account.role,
    },
  })

  const response = NextResponse.json({
    ok: true,
    email: account.email,
    role: account.role,
    token,
  })

  response.cookies.set("next-auth.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
  })

  return response
}
