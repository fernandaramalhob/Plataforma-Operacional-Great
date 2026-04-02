import type { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import {
  canManageUserProfile,
  getCurrentUser,
  isAdmin,
} from "@/lib/authorization"
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

async function getAdmin() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return {
      error: NextResponse.json<ApiErrorResponse>(
        { error: "Não autorizado" },
        { status: 401 }
      ),
    }
  }

  if (!isAdmin(currentUser)) {
    return {
      error: NextResponse.json<ApiErrorResponse>(
        { error: "Apenas administradores podem acessar perfis de gestores." },
        { status: 403 }
      ),
    }
  }

  return { currentUser }
}

async function getManagedUser(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
    },
  })

  if (!user) {
    return {
      error: NextResponse.json<ApiErrorResponse>(
        { error: "Gestor não encontrado" },
        { status: 404 }
      ),
    }
  }

  return { user }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await getAdmin()

    if ("error" in adminResult) {
      return adminResult.error
    }

    const { id } = await params
    const managedUserResult = await getManagedUser(id)

    if ("error" in managedUserResult) {
      return managedUserResult.error
    }

    if (!canManageUserProfile(adminResult.currentUser, managedUserResult.user)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "O admin só pode acessar perfis de gestores." },
        { status: 403 }
      )
    }

    return NextResponse.json<ProfileResponse>(
      toProfileResponse(managedUserResult.user)
    )
  } catch (error) {
    logError("users.profile.get", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await getAdmin()

    if ("error" in adminResult) {
      return adminResult.error
    }

    const { id } = await params
    const managedUserResult = await getManagedUser(id)

    if ("error" in managedUserResult) {
      return managedUserResult.error
    }

    if (!canManageUserProfile(adminResult.currentUser, managedUserResult.user)) {
      return NextResponse.json<ApiErrorResponse>(
        { error: "O admin só pode editar perfis de gestores." },
        { status: 403 }
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

    const updatedUser = await prisma.user.update({
      where: { id: managedUserResult.user.id },
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
      user: toProfileResponse(updatedUser),
    })
  } catch (error) {
    logError("users.profile.put", error)
    return NextResponse.json<ApiErrorResponse>(
      { error: "Erro interno" },
      { status: 500 }
    )
  }
}
