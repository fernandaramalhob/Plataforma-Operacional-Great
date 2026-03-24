import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { resolveMetaToken } from "@/lib/meta-token"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user?.metaAccessToken) {
      return NextResponse.json(
        { error: "Token META não configurado" },
        { status: 400 }
      )
    }

    const { token, encryptedToken } = resolveMetaToken(user.metaAccessToken)

    if (encryptedToken) {
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { metaAccessToken: encryptedToken },
        })
      } catch (error) {
        logError("meta-account.reencrypt", error, { userId: user.id })
      }
    }

    const res = await fetch(
      `https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_status,currency,amount_spent&access_token=${encodeURIComponent(token)}&limit=100`
    )
    const data = await res.json()

    if (data.error) {
      return NextResponse.json(
        { error: "Erro ao buscar contas META", detail: data.error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(data.data ?? [])
  } catch (error) {
    logError("meta-account.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
