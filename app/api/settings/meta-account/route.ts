import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { getMetaAdAccounts } from "@/lib/meta-api"
import { resolveMetaTokenFromOwners } from "@/lib/meta-token-status"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import type { ApiErrorResponse } from "@/types/api.types"
import type { MetaAccount } from "@/types/meta.types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Nao autorizado" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        metaAccessToken: true,
        metaTokenExpiresAt: true,
      },
    })

    if (!user?.metaAccessToken) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Token META nao configurado" },
        { status: 400 }
      )
    }

    const { health } = await resolveMetaTokenFromOwners([user])

    if (!health.ok || !health.token) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: health.detail ?? "Token META indisponivel",
          tokenStatus: health.status,
          expiresAt: health.expiresAt?.toISOString() ?? null,
        },
        { status: 400 }
      )
    }

    const accounts = (await getMetaAdAccounts(health.token)).reduce<MetaAccount[]>(
      (result, account) => {
        if (typeof account.id !== "string" || typeof account.name !== "string") {
          return result
        }

        result.push({
          id: account.id,
          name: account.name,
          account_status:
            typeof account.account_status === "number"
              ? account.account_status
              : null,
        })

        return result
      },
      []
    )

    return NextResponse.json<MetaAccount[]>(accounts)
  } catch (error) {
    logError("meta-account.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
