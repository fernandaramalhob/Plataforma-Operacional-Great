import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
    }

    const { adAccountId, adAccountName } = await request.json()

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 })
    }

    // Verifica se cliente já existe
    const existing = await prisma.client.findFirst({
      where: { adAccountId },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Esta conta já foi importada como cliente" },
        { status: 409 }
      )
    }

    // Cria o cliente a partir da AdAccount
    const client = await prisma.client.create({
      data: {
        name: adAccountName,
        adAccountId,
        adAccountName,
        managerId: user.id,
        status: "ACTIVE",
      },
    })

    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    logError("import-client.post", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
