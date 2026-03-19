import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { id } = await params

    // Busca o cliente e o token do gestor
    const client = await prisma.client.findUnique({
      where: { id },
      include: { manager: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }

    // Busca o usuário logado para pegar o token
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    const token = client.manager?.metaAccessToken ?? user?.metaAccessToken

    if (!token || !client.adAccountId) {
      return NextResponse.json({ error: "Token META ou conta de anúncio não configurados" }, { status: 400 })
    }

    // Busca campanhas na META API
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${client.adAccountId}/campaigns?fields=id,name,status,objective,insights{spend,impressions,clicks}&access_token=${token}&limit=50`
    )
    const data = await res.json()

    if (data.error) {
      return NextResponse.json({ error: data.error.message }, { status: 400 })
    }

    return NextResponse.json(data.data ?? [])
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}