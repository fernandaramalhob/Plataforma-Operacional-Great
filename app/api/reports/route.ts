import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const since = searchParams.get("since")
    const until = searchParams.get("until")
    const objective = searchParams.get("objective") // ALL, TRAFFIC, CONVERSIONS, MESSAGES

    if (!clientId) {
      return NextResponse.json({ error: "clientId obrigatório" }, { status: 400 })
    }

    // Busca o cliente e o token do gestor
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { manager: true },
    })

    if (!client?.adAccountId) {
      return NextResponse.json({ error: "Cliente sem conta META configurada" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    const token = client.manager?.metaAccessToken ?? user?.metaAccessToken

    if (!token) {
      return NextResponse.json({ error: "Token META não configurado" }, { status: 400 })
    }

    const timeRange = since && until
      ? `&time_range={"since":"${since}","until":"${until}"}`
      : `&date_preset=last_7d`

    // Busca campanhas com insights
    const fields = [
      "id", "name", "status", "objective",
      "insights{spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values}"
    ].join(",")

    let campaignsUrl = `https://graph.facebook.com/v18.0/${client.adAccountId}/campaigns?fields=${fields}&access_token=${token}&limit=50${timeRange}`

    if (objective && objective !== "ALL") {
      campaignsUrl += `&filtering=[{"field":"objective","operator":"IN","value":["${objective}"]}]`
    }

    const campaignsRes = await fetch(campaignsUrl)
    const campaignsData = await campaignsRes.json()

    if (campaignsData.error) {
      return NextResponse.json({ error: campaignsData.error.message }, { status: 400 })
    }

    // Busca insights da conta toda
    const accountInsightsUrl = `https://graph.facebook.com/v18.0/${client.adAccountId}/insights?fields=spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values&access_token=${token}${timeRange}`

    const accountRes = await fetch(accountInsightsUrl)
    const accountData = await accountRes.json()

    // Busca breakdown por dia
    const dailyUrl = `https://graph.facebook.com/v18.0/${client.adAccountId}/insights?fields=spend,impressions,clicks,actions&time_increment=1&access_token=${token}${timeRange}`

    const dailyRes = await fetch(dailyUrl)
    const dailyData = await dailyRes.json()

    return NextResponse.json({
      client: {
        id: client.id,
        name: client.name,
        company: client.company,
        adAccountId: client.adAccountId,
      },
      campaigns: campaignsData.data ?? [],
      accountInsights: accountData.data?.[0] ?? {},
      dailyInsights: dailyData.data ?? [],
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}