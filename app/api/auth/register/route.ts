import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import {
  getAuthValidationMessage,
  registerUserSchema,
} from "@/lib/validations/auth.schema"
import type {
  ApiErrorResponse,
  RegisterUserResponse,
} from "@/types/api.types"

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Nao autorizado" },
      { status: 401 }
    )
  }

  if (!isAdmin(currentUser)) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Apenas administradores podem cadastrar usuarios." },
      { status: 403 }
    )
  }

  let parsedPayload: ReturnType<typeof registerUserSchema.safeParse>

  try {
    parsedPayload = registerUserSchema.safeParse(await request.json())
  } catch {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Payload invalido" },
      { status: 400 }
    )
  }

  if (!parsedPayload.success) {
    return NextResponse.json<ApiErrorResponse>(
      { error: getAuthValidationMessage(parsedPayload.error) },
      { status: 400 }
    )
  }

  try {
    const { name, email, password, role } = parsedPayload.data
    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (existingUser) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Ja existe um usuario com esse e-mail" },
        { status: 409 }
      )
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashPassword(password),
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    return NextResponse.json<RegisterUserResponse>({
      success: true,
      user,
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
