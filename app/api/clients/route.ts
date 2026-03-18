import { NextResponse } from "next/server"
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
    const body = await request.json()
    const client = await prisma.client.create({
      data: {
        name: body.name,
        company: body.company,
        email: body.email,
        phone: body.phone,
        notes: body.notes,
        whatsappGroupId: body.whatsappGroupId,
      },
    })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: "Erro ao criar cliente" },
      { status: 500 }
    )
  }
}