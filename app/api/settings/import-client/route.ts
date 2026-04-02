import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import {
  getMetaValidationMessage,
  importClientSchema,
} from "@/lib/validations/meta.schema"
import type { ApiErrorResponse } from "@/types/api.types"

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const parsedBody = importClientSchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return NextResponse.json<ApiErrorResponse>(
        { error: getMetaValidationMessage(parsedBody.error) },
        { status: 400 }
      )
    }

    const { adAccountId, adAccountName } = parsedBody.data
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    const existing = await prisma.client.findFirst({
      where: { adAccountId },
    })

    if (existing) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Esta conta já foi importada como cliente" },
        { status: 409 }
      )
    }

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
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
