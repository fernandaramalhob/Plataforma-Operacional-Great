import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getMetaAdAccounts,
  getMetaBusinesses,
  getMetaProfiles,
  type MetaApiItem,
  type MetaBusiness,
} from "@/lib/meta-api"
import { resolveMetaTokenFromOwners } from "@/lib/meta-token-status"
import { findUserForSession } from "@/lib/session-user"
import { logError } from "@/lib/safe-logger"
import type { ApiErrorResponse } from "@/types/api.types"
import type {
  ClientMetaBrandOption,
  ClientMetaOptionsResponse,
  ClientMetaProfileOption,
} from "@/types/client.types"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const user = await findUserForSession({
      sessionUser: session.user,
      select: {
        id: true,
        metaAccessToken: true,
        metaTokenExpiresAt: true,
      },
    })

    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Usuário da sessão não encontrado" },
        { status: 404 }
      )
    }

    const { health } = await resolveMetaTokenFromOwners([user])

    if (!health.ok || !health.token) {
      return NextResponse.json<ApiErrorResponse>(
        {
          error: health.detail ?? "Token META indisponível",
          tokenStatus: health.status,
          expiresAt: health.expiresAt?.toISOString() ?? null,
        },
        { status: 400 }
      )
    }

    const adAccounts = await getMetaAdAccounts(
      health.token,
      "id,name,account_status",
      100
    )

    let profileItems: MetaApiItem[] = []
    try {
      profileItems = await getMetaProfiles(health.token, 100)
    } catch {
      profileItems = []
    }

    let businessesData: MetaBusiness[] = []
    try {
      businessesData = await getMetaBusinesses(health.token, 100)
    } catch {
      businessesData = []
    }

    const filteredAdAccounts = adAccounts.filter(
      (item): item is Required<Pick<MetaApiItem, "id" | "name">> & MetaApiItem =>
        typeof item.id === "string" && typeof item.name === "string"
    )

    const businessNameByAdAccountId = new Map<string, string>()

    for (const business of businessesData) {
      if (!business.name) {
        continue
      }

      const linkedAccounts = [
        ...(business.owned_ad_accounts?.data ?? []),
        ...(business.client_ad_accounts?.data ?? []),
      ]

      for (const account of linkedAccounts) {
        if (account.id && !businessNameByAdAccountId.has(account.id)) {
          businessNameByAdAccountId.set(account.id, business.name)
        }
      }
    }

    const profileMap = new Map<string, ClientMetaProfileOption>()

    for (const item of profileItems) {
      if (item.id && item.name) {
        profileMap.set(item.name.toLowerCase(), {
          id: item.id,
          name: item.name,
        })
      }
    }

    if (profileMap.size === 0) {
      for (const account of filteredAdAccounts) {
        profileMap.set(account.name.toLowerCase(), {
          id: account.id,
          name: account.name,
        })
      }
    }

    const profiles = Array.from(profileMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    )

    const brands: ClientMetaBrandOption[] = filteredAdAccounts
      .map((account) => {
        const businessName = businessNameByAdAccountId.get(account.id) ?? null
        const name = businessName ?? account.name
        const displayName =
          businessName && businessName !== account.name
            ? `${businessName} - ${account.name}`
            : name

        return {
          id: account.id,
          name,
          displayName,
          businessName,
          adAccountId: account.id,
          adAccountName: account.name,
          accountStatus:
            typeof account.account_status === "number"
              ? account.account_status
              : null,
        }
      })
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "pt-BR"))

    return NextResponse.json<ClientMetaOptionsResponse>({ profiles, brands })
  } catch (error) {
    logError("clients.meta-options.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro ao carregar opções META para clientes" },
      { status: 500 }
    )
  }
}
