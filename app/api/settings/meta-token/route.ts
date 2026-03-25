import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { encryptMetaToken } from "@/lib/meta-token"
import {
  getStoredMetaTokenHealth,
  inspectMetaTokenValue,
  type MetaTokenStatus,
} from "@/lib/meta-token-status"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import { metaTokenSchema } from "@/lib/validations/meta.schema"
import type { ApiErrorResponse } from "@/types/api.types"
import type {
  MetaTokenSaveResponse,
  MetaTokenStatusResponse,
} from "@/types/meta.types"

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
      return NextResponse.json<ApiErrorResponse>(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    const { session, user, email, dbError } = context

    if (dbError) {
      return NextResponse.json<MetaTokenStatusResponse>(
        {
          sessionUser: {
            id: session.user.id,
            email,
            role: session.user.role,
            name: session.user.name ?? email,
          },
          hasSavedToken: false,
          tokenStatus: "unknown" satisfies MetaTokenStatus,
          detail: dbError,
          expiresAt: null,
        },
        { status: 503 }
      )
    }

    if (!user?.metaAccessToken) {
      return NextResponse.json<MetaTokenStatusResponse>({
        sessionUser: {
          id: session.user.id,
          email,
          role: session.user.role,
          name: session.user.name ?? email,
        },
        hasSavedToken: false,
        tokenStatus: "missing" satisfies MetaTokenStatus,
        expiresAt: null,
      })
    }

    const validation = await getStoredMetaTokenHealth({
      storedToken: user.metaAccessToken,
      storedExpiresAt: user.metaTokenExpiresAt,
      forceRemote: true,
    })

    if (
      validation.encryptedToken ||
      (user.metaTokenExpiresAt?.getTime() ?? null) !==
        (validation.expiresAt?.getTime() ?? null)
    ) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(validation.encryptedToken
              ? { metaAccessToken: validation.encryptedToken }
              : {}),
            metaTokenExpiresAt: validation.expiresAt,
          },
        })
      } catch (error) {
        logError("meta-token.sync", error, { userId: user.id })
      }
    }

    return NextResponse.json<MetaTokenStatusResponse>({
      sessionUser: {
        id: session.user.id,
        email,
        role: session.user.role,
        name: session.user.name ?? email,
      },
      hasSavedToken: true,
      tokenMasked: validation.token ? maskToken(validation.token) : null,
      tokenStatus: validation.status,
      metaUser: validation.ok ? validation.metaUser : null,
      detail: validation.detail,
      expiresAt: validation.expiresAt?.toISOString() ?? null,
    })
  } catch (error) {
    logError("meta-token.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthenticatedContext()

    if (!context) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    const { email, user, dbError } = context

    if (dbError) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Banco de dados indisponivel",
          detail: dbError,
        },
        { status: 503 }
      )
    }

    const parsedBody = metaTokenSchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Token META obrigatorio" },
        { status: 400 }
      )
    }

    const sanitizedToken = parsedBody.data.token
    const validation = await inspectMetaTokenValue(sanitizedToken)

    if (!validation.ok) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: "Token META invalido",
          detail: validation.detail,
          tokenStatus: validation.status,
        },
        { status: 400 }
      )
    }

    const encryptedToken = encryptMetaToken(sanitizedToken)

    await prisma.user.upsert({
      where: { email },
      update: {
        metaAccessToken: encryptedToken,
        metaTokenExpiresAt: validation.expiresAt,
      },
      create: {
        email,
        passwordHash: user?.passwordHash ?? "",
        role: user?.role ?? "MANAGER",
        metaAccessToken: encryptedToken,
        metaTokenExpiresAt: validation.expiresAt,
      },
    })

    return NextResponse.json<MetaTokenSaveResponse>({
      success: true,
      tokenStatus: validation.status,
      tokenMasked: maskToken(sanitizedToken),
      metaUser: validation.metaUser,
      expiresAt: validation.expiresAt?.toISOString() ?? null,
      detail: validation.detail,
    })
  } catch (error) {
    logError("meta-token.post", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
