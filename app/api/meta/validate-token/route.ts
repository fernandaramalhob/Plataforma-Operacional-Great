import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/authorization"
import {
  getStoredMetaTokenHealth,
  inspectMetaTokenValue,
} from "@/lib/meta-token-status"
import { logError } from "@/lib/safe-logger"
import { metaTokenSchema } from "@/lib/validations/meta.schema"
import type { ApiErrorResponse } from "@/types/api.types"
import type { MetaTokenValidationResponse } from "@/types/meta.types"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    if (!user.metaAccessToken) {
      return NextResponse.json<MetaTokenValidationResponse>(
        {
          ok: false,
          tokenStatus: "missing",
          detail: "Token META nao configurado",
          expiresAt: null,
        },
        { status: 200 }
      )
    }

    const health = await getStoredMetaTokenHealth({
      storedToken: user.metaAccessToken,
      storedExpiresAt: user.metaTokenExpiresAt,
      forceRemote: true,
    })

    return NextResponse.json<MetaTokenValidationResponse>({
      ok: health.ok,
      tokenStatus: health.status,
      detail: health.detail,
      expiresAt: health.expiresAt?.toISOString() ?? null,
      metaUser: health.metaUser,
    })
  } catch (error) {
    logError("meta.validate-token.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const parsedBody = metaTokenSchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Token META obrigatorio" },
        { status: 400 }
      )
    }

    const validation = await inspectMetaTokenValue(parsedBody.data.token)

    if (!validation.ok) {
      return NextResponse.json<MetaTokenValidationResponse>(
        {
          ok: false,
          tokenStatus: validation.status,
          detail: validation.detail,
          expiresAt: validation.expiresAt?.toISOString() ?? null,
        },
        { status: 400 }
      )
    }

    return NextResponse.json<MetaTokenValidationResponse>({
      ok: true,
      tokenStatus: validation.status,
      detail: validation.detail,
      expiresAt: validation.expiresAt?.toISOString() ?? null,
      metaUser: validation.metaUser,
    })
  } catch (error) {
    logError("meta.validate-token.post", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
