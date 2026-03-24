import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import {
  clientPayloadSchema,
  getClientValidationMessage,
} from "@/lib/validations/client.schema"

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
      include: { campaigns: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    return NextResponse.json(client)
  } catch (error) {
    logError("client.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const parsedClient = clientPayloadSchema.safeParse(body)
    const existingClient = await prisma.client.findUnique({
      where: { id },
      select: {
        id: true,
        managerId: true,
      },
    })

    if (!existingClient) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, existingClient.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    if (!parsedClient.success) {
      return NextResponse.json(
        { error: getClientValidationMessage(parsedClient.error) },
        { status: 400 }
      )
    }

    const clientData = parsedClient.data
    const client = await prisma.client.update({
      where: { id },
      data: {
        name: clientData.name,
        company: clientData.company ?? null,
        email: clientData.email ?? null,
        phone: clientData.phone ?? null,
        notes: clientData.notes ?? null,
        whatsappGroupId: clientData.whatsappGroupId ?? null,
        status: clientData.status,
      },
    })

    return NextResponse.json(client)
  } catch (error) {
    logError("client.update", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
