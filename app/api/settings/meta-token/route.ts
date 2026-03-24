import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { encryptMetaToken, resolveMetaToken } from "@/lib/meta-token"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

type TokenStatus = "missing" | "active" | "expired" | "invalid" | "unknown"
type AuthenticatedContext = {
  session: Awaited<ReturnType<typeof getServerSession>>
  email: string
  user: Awaited<ReturnType<typeof prisma.user.findUnique>> | null
  dbError: string | null
}

function maskToken(token: string) {
  if (token.length <= 12) {
    return `${token.slice(0, 4)}...${token.slice(-2)}`
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

async function validateMetaToken(token: string) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${encodeURIComponent(token)}&fields=id,name,email`,
      { cache: "no-store" }
    )
    const data = await response.json()

    if (data?.error) {
      const message = String(data.error.message ?? "Token META invalido")
      const lowerMessage = message.toLowerCase()
      const tokenStatus: TokenStatus = lowerMessage.includes("session")
        || lowerMessage.includes("expired")
        || lowerMessage.includes("invalid oauth")
        || lowerMessage.includes("invalid access token")
        ? "expired"
        : "invalid"

      return {
        ok: false,
        tokenStatus,
        detail: message,
      }
    }

    return {
      ok: true,
      tokenStatus: "active" as TokenStatus,
      metaUser: {
        id: data.id ?? null,
        name: data.name ?? null,
        email: data.email ?? null,
      },
    }
  } catch (error) {
    return {
      ok: false,
      tokenStatus: "unknown" as TokenStatus,
      detail: error instanceof Error ? error.message : "Falha ao validar token META",
    }
  }
}

async function getAuthenticatedContext() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const email = session.user.email.trim().toLowerCase()

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    return {
      session,
      email,
      user,
      dbError: null,
    } satisfies AuthenticatedContext
  } catch {
    return {
      session,
      email,
      user: null,
      dbError:
        "Falha temporaria ao consultar o banco de dados. O token salvo pode continuar la; tente novamente em instantes.",
    } satisfies AuthenticatedContext
  }
}

export async function GET() {
  try {
    const context = await getAuthenticatedContext()

    if (!context) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { session, user, email, dbError } = context

    if (dbError) {
      return NextResponse.json(
        {
          sessionUser: {
            id: session.user.id,
            email,
            role: session.user.role,
            name: session.user.name ?? email,
          },
          hasSavedToken: false,
          tokenStatus: "unknown" satisfies TokenStatus,
          detail: dbError,
        },
        { status: 503 }
      )
    }

    if (!user?.metaAccessToken) {
      return NextResponse.json({
        sessionUser: {
          id: session.user.id,
          email,
          role: session.user.role,
          name: session.user.name ?? email,
        },
        hasSavedToken: false,
        tokenStatus: "missing" satisfies TokenStatus,
      })
    }

    const { token: decryptedToken, encryptedToken } = resolveMetaToken(
      user.metaAccessToken
    )

    if (encryptedToken) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { metaAccessToken: encryptedToken },
        })
      } catch (error) {
        logError("meta-token.reencrypt", error, { userId: user.id })
      }
    }

    const validation = await validateMetaToken(decryptedToken)

    return NextResponse.json({
      sessionUser: {
        id: session.user.id,
        email,
        role: session.user.role,
        name: session.user.name ?? email,
      },
      hasSavedToken: true,
      tokenMasked: maskToken(decryptedToken),
      tokenStatus: validation.tokenStatus,
      metaUser: validation.ok ? validation.metaUser : null,
      detail: validation.ok ? null : validation.detail,
      expiresAt: user.metaTokenExpiresAt,
    })
  } catch (error) {
    logError("meta-token.get", error)
    return NextResponse.json(
      { error: "Erro interno", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedContext()

    if (!context) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { email, user, dbError } = context

    if (dbError) {
      return NextResponse.json(
        {
          error: "Banco de dados indisponivel",
          detail: dbError,
        },
        { status: 503 }
      )
    }

    const { token } = await request.json()

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Token META obrigatorio" }, { status: 400 })
    }

    const sanitizedToken = token.trim()
    const validation = await validateMetaToken(sanitizedToken)

    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Token META invalido",
          detail: validation.detail,
          tokenStatus: validation.tokenStatus,
        },
        { status: 400 }
      )
    }

    const encryptedToken = encryptMetaToken(sanitizedToken)

    await prisma.user.upsert({
      where: { email },
      update: {
        metaAccessToken: encryptedToken,
        metaTokenExpiresAt: null,
      },
      create: {
        email,
        passwordHash: user?.passwordHash ?? "",
        role: user?.role ?? "MANAGER",
        metaAccessToken: encryptedToken,
      },
    })

    return NextResponse.json({
      success: true,
      tokenStatus: validation.tokenStatus,
      tokenMasked: maskToken(sanitizedToken),
      metaUser: validation.metaUser,
    })
  } catch (error) {
    logError("meta-token.post", error)
    return NextResponse.json(
      { error: "Erro interno", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
