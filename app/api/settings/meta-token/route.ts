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
import { findUserForSession } from "@/lib/session-user"
import { logError } from "@/lib/safe-logger"
import { metaTokenSchema } from "@/lib/validations/meta.schema"
import type { ApiErrorResponse } from "@/types/api.types"
import type {
  MetaTokenSaveResponse,
  MetaTokenStatusResponse,
} from "@/types/meta.types"
import {
  createMetaTokenPresetToken,
  getMetaAccessTokenFromEnv,
  getMetaTokenPresetFromStoredToken,
  getMetaTokenPresetLabel,
  type MetaTokenPreset,
} from "@/lib/meta-token"

type AuthenticatedContext = {
  session: Awaited<ReturnType<typeof getServerSession>>
  email: string
  user: {
    id: string
    email: string
    name: string | null
    role: "ADMIN" | "MANAGER"
    passwordHash: string
    metaAccessToken: string | null
    metaTokenExpiresAt: Date | null
  } | null
  dbError: string | null
}

function maskToken(token: string) {
  if (token.length <= 12) {
    return `${token.slice(0, 4)}...${token.slice(-2)}`
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`
}

function isMetaTokenPreset(value: unknown): value is MetaTokenPreset {
  return value === "ISAQUE" || value === "BRAYTON"
}

async function inspectSelectedPresetToken(preset: MetaTokenPreset) {
  const token = getMetaAccessTokenFromEnv(preset)

  if (!token) {
    throw new Error(
      `Token META ${getMetaTokenPresetLabel(preset)} nao configurado no ambiente.`
    )
  }

  const validation = await inspectMetaTokenValue(token)

  if (!validation.ok) {
    throw new Error(validation.detail ?? "Token META invalido")
  }

  return {
    token,
    validation,
  }
}

async function getAuthenticatedContext() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    return null
  }

  const email = session.user.email.trim().toLowerCase()

  try {
    const user = await findUserForSession({
      sessionUser: session.user,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        passwordHash: true,
        metaAccessToken: true,
        metaTokenExpiresAt: true,
      },
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
          selectedPreset: null,
          detail: dbError,
          expiresAt: null,
        },
        { status: 503 }
      )
    }

    const validation = await getStoredMetaTokenHealth({
      storedToken: user?.metaAccessToken ?? null,
      storedExpiresAt: user?.metaTokenExpiresAt ?? null,
      forceRemote: true,
    })

    if (
      user?.id &&
      validation.source === "database" &&
      (
        validation.encryptedToken ||
        (user.metaTokenExpiresAt?.getTime() ?? null) !==
          (validation.expiresAt?.getTime() ?? null)
      )
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

    const selectedPreset = getMetaTokenPresetFromStoredToken(user?.metaAccessToken ?? null)

    return NextResponse.json<MetaTokenStatusResponse>({
      sessionUser: {
        id: session.user.id,
        email,
        role: session.user.role,
        name: session.user.name ?? email,
      },
      hasSavedToken: validation.status !== "missing",
      tokenMasked: validation.token ? maskToken(validation.token) : null,
      selectedPreset,
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

    const payload = parsedBody.data as { token?: string; preset?: MetaTokenPreset }

    if (payload.preset) {
      const preset = payload.preset
      let presetValidation

      try {
        presetValidation = await inspectSelectedPresetToken(preset)
      } catch (error) {
        return NextResponse.json<ApiErrorResponse>(
          {
            error: error instanceof Error ? error.message : "Token META invalido",
          },
          { status: 400 }
        )
      }
      const presetToken = createMetaTokenPresetToken(preset)

      if (user?.id) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            metaAccessToken: presetToken,
            metaTokenExpiresAt: presetValidation.validation.expiresAt,
          },
        })
      } else {
        await prisma.user.upsert({
          where: { email },
          update: {
            metaAccessToken: presetToken,
            metaTokenExpiresAt: presetValidation.validation.expiresAt,
          },
          create: {
            email,
            passwordHash: user?.passwordHash ?? "",
            role: user?.role ?? "MANAGER",
            metaAccessToken: presetToken,
            metaTokenExpiresAt: presetValidation.validation.expiresAt,
          },
        })
      }

      return NextResponse.json<MetaTokenSaveResponse>({
        success: true,
        tokenStatus: presetValidation.validation.status,
        tokenMasked: maskToken(presetValidation.token),
        selectedPreset: preset,
        metaUser: presetValidation.validation.metaUser,
        expiresAt: presetValidation.validation.expiresAt?.toISOString() ?? null,
        detail: presetValidation.validation.detail,
      })
    }

    const sanitizedToken = payload.token?.trim() ?? ""
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

    if (user?.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          metaAccessToken: encryptedToken,
          metaTokenExpiresAt: validation.expiresAt,
        },
      })
    } else {
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
    }

    return NextResponse.json<MetaTokenSaveResponse>({
      success: true,
      tokenStatus: validation.status,
      tokenMasked: maskToken(sanitizedToken),
      selectedPreset: null,
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
