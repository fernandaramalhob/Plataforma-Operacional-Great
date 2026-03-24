import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { resolveMetaTokenCandidate } from "@/lib/meta-token"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: { manager: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    const tokenCandidate = resolveMetaTokenCandidate(
      client.manager?.metaAccessToken,
      user.metaAccessToken
    )

    if (tokenCandidate?.encryptedToken) {
      const tokenOwnerId = tokenCandidate.index === 0 ? client.manager?.id : user.id

      if (tokenOwnerId) {
        try {
          await prisma.user.update({
            where: { id: tokenOwnerId },
            data: { metaAccessToken: tokenCandidate.encryptedToken },
          })
        } catch (error) {
          logError("client-campaigns.reencrypt", error, { userId: tokenOwnerId })
        }
      }
    }

    const token = tokenCandidate?.token ?? null

    if (!token || !client.adAccountId) {
      return NextResponse.json(
        { error: "Token META ou conta de anuncio nao configurados" },
        { status: 400 }
      )
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/${client.adAccountId}/campaigns?fields=id,name,status,objective,insights{spend,impressions,clicks}&access_token=${encodeURIComponent(token)}&limit=50`
    )
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    return NextResponse.json(data.data ?? [])
  } catch (error) {
    logError("client-campaigns.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
