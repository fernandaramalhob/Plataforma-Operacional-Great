import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import {
  getProfileValidationMessage,
  profileUpdateSchema,
} from "@/lib/validations/profile.schema"
import type {
  ApiErrorResponse,
  ProfileResponse,
  UpdateProfileResponse,
} from "@/types/api.types"

function toProfileResponse(user: {
  id: string
  email: string
  name: string | null
  role: ProfileResponse["role"]
  avatarUrl: string | null
}): ProfileResponse {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
    })

    if (!user) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    return NextResponse.json<ProfileResponse>(toProfileResponse(user))
  } catch (error) {
    logError("profile.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      )
    }

    const parsedBody = profileUpdateSchema.safeParse(await request.json())

    if (!parsedBody.success) {
      return NextResponse.json<ApiErrorResponse>(
        { error: getProfileValidationMessage() },
        { status: 400 }
      )
    }

    const { name, password, avatarUrl } = parsedBody.data

    const updateData: Prisma.UserUpdateInput = {}
    if (name !== undefined) updateData.name = name
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl
    if (password !== undefined) updateData.passwordHash = hashPassword(password)

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "Nenhum campo enviado para atualização" },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        avatarUrl: true,
      },
    })

    return NextResponse.json<UpdateProfileResponse>({
      success: true,
      user: toProfileResponse(user),
    })
  } catch (error) {
    logError("profile.put", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
