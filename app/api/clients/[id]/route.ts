import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id },
      include: { campaigns: true },
    })
    if (!client) {
      return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 })
    }
    return NextResponse.json(client)
  } catch (error) {
    console.error("Erro ao buscar cliente:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: body.name,
        company: body.company ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        notes: body.notes ?? null,
        whatsappGroupId: body.whatsappGroupId ?? null,
      },
    })
    return NextResponse.json(client)
  } catch (error) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}