import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        campaigns: true,
      },
    })
    return NextResponse.json(clients)
  } catch (error) {
    console.error("Erro:", error)
    return NextResponse.json([], { status: 200 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const manager = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    const name = typeof body.name === "string" ? body.name.trim() : ""
    const company = typeof body.company === "string" ? body.company.trim() : ""
    const email = typeof body.email === "string" ? body.email.trim() : ""
    const phone = typeof body.phone === "string" ? body.phone.trim() : ""
    const notes = typeof body.notes === "string" ? body.notes.trim() : ""
    const whatsappGroupId =
      typeof body.whatsappGroupId === "string"
        ? body.whatsappGroupId.trim()
        : ""
    const adAccountId =
      typeof body.adAccountId === "string" ? body.adAccountId.trim() : ""
    const adAccountName =
      typeof body.adAccountName === "string" ? body.adAccountName.trim() : ""

    if (!name) {
      return NextResponse.json(
        { error: "Nome do perfil e obrigatorio" },
        { status: 400 }
      )
    }

    const client = await prisma.client.create({
      data: {
        name,
        company: company || null,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
        whatsappGroupId: whatsappGroupId || null,
        adAccountId: adAccountId || null,
        adAccountName: adAccountName || null,
        managerId: manager?.id ?? null,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    )
  }
}
