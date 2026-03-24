import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveMetaToken } from "@/lib/meta-token"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

type MetaItem = {
  id?: string
  name?: string
  account_status?: number
}

type MetaListResponse = {
  data?: MetaItem[]
  error?: {
    message?: string
  }
}

type MetaBusiness = {
  id?: string
  name?: string
  owned_ad_accounts?: {
    data?: MetaItem[]
  }
  client_ad_accounts?: {
    data?: MetaItem[]
  }
}

type MetaBusinessResponse = {
  data?: MetaBusiness[]
  error?: {
    message?: string
  }
}

type ProfileOption = {
  id: string
  name: string
}

type BrandOption = {
  id: string
  name: string
  displayName: string
  businessName: string | null
  adAccountId: string
  adAccountName: string
  accountStatus: number | null
}

async function fetchMetaResponse<T>(url: string) {
  const res = await fetch(url, { cache: "no-store" })
  const data = await res.json()

  if (!res.ok || data?.error) {
    const message =
      data?.error?.message ??
      `Erro ao consultar META API (${res.status})`

    throw new Error(message)
  }

  return data as T
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.metaAccessToken) {
      return NextResponse.json(
        { error: "Token META nao configurado para o usuario logado" },
        { status: 400 }
      )
    }

    const { token: rawToken, encryptedToken } = resolveMetaToken(
      user.metaAccessToken
    )

    if (encryptedToken) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { metaAccessToken: encryptedToken },
        })
      } catch (error) {
        logError("clients.meta-options.reencrypt", error, { userId: user.id })
      }
    }

    const token = encodeURIComponent(rawToken)
    const baseUrl = "https://graph.facebook.com/v18.0"

    const adAccountsData = await fetchMetaResponse<MetaListResponse>(
      `${baseUrl}/me/adaccounts?fields=id,name,account_status&access_token=${token}&limit=100`
    )

    let profileItems: MetaItem[] = []
    try {
      const profilesData = await fetchMetaResponse<MetaListResponse>(
        `${baseUrl}/me/accounts?fields=id,name&access_token=${token}&limit=100`
      )
      profileItems = profilesData.data ?? []
    } catch {
      profileItems = []
    }

    let businessesData: MetaBusiness[] = []
    try {
      const businessesResponse = await fetchMetaResponse<MetaBusinessResponse>(
        `${baseUrl}/me/businesses?fields=id,name,owned_ad_accounts.limit(100){id,name,account_status},client_ad_accounts.limit(100){id,name,account_status}&access_token=${token}&limit=100`
      )
      businessesData = businessesResponse.data ?? []
    } catch {
      businessesData = []
    }

    const adAccounts = (adAccountsData.data ?? []).filter(
      (item): item is Required<Pick<MetaItem, "id" | "name">> & MetaItem =>
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

    const profileMap = new Map<string, ProfileOption>()

    for (const item of profileItems) {
      if (item.id && item.name) {
        profileMap.set(item.name.toLowerCase(), {
          id: item.id,
          name: item.name,
        })
      }
    }

    if (profileMap.size === 0) {
      for (const account of adAccounts) {
        profileMap.set(account.name.toLowerCase(), {
          id: account.id,
          name: account.name,
        })
      }
    }

    const profiles = Array.from(profileMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "pt-BR")
    )

    const brands: BrandOption[] = adAccounts
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

    return NextResponse.json({ profiles, brands })
  } catch (error) {
    logError("clients.meta-options.get", error)
    return NextResponse.json(
      { error: "Erro ao carregar opcoes META para clientes" },
      { status: 500 }
    )
  }
}
