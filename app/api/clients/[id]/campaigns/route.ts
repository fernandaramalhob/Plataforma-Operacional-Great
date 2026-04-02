import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { getMetaCampaigns } from "@/lib/meta-api"
import { resolveMetaTokenFromOwners } from "@/lib/meta-token-status"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            metaAccessToken: true,
            metaTokenExpiresAt: true,
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    const { health } = await resolveMetaTokenFromOwners([
      {
        id: client.manager?.id ?? user.id,
        metaAccessToken: client.manager?.metaAccessToken ?? null,
        metaTokenExpiresAt: client.manager?.metaTokenExpiresAt ?? null,
      },
      user,
    ])

    if (!health.ok || !health.token || !client.adAccountId) {
      return NextResponse.json(
        {
          error:
            health.detail ??
            "Token META ou conta de anúncio não configurados",
          tokenStatus: health.status,
          expiresAt: health.expiresAt,
        },
        { status: 400 }
      )
    }

    const campaigns = await getMetaCampaigns({
      adAccountId: client.adAccountId,
      token: health.token,
      fields: "id,name,status,objective,insights{spend,impressions,clicks}",
      limit: 50,
    })

    return NextResponse.json(campaigns)
  } catch (error) {
    logError("client-campaigns.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
