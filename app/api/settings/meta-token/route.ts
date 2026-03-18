import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { token } = await request.json()

    // Valida o token na META API
    const metaRes = await fetch(
      `https://graph.facebook.com/v18.0/me?access_token=${token}&fields=id,name,email`
    )
    const metaData = await metaRes.json()

    if (metaData.error) {
      return NextResponse.json(
        { error: "Token META inválido", detail: metaData.error.message },
        { status: 400 }
      )
    }

    // Salva o token no usuário
    await prisma.user.upsert({
      where: { email: session.user.email },
      update: { metaAccessToken: token },
      create: {
        email: session.user.email,
        passwordHash: "",
        metaAccessToken: token,
      },
    })

    return NextResponse.json({ success: true, metaUser: metaData })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
} 