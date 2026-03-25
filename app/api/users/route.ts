import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"
import type { ApiErrorResponse, UsersListResponse } from "@/types/api.types"

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Nao autorizado" },
      { status: 401 }
    )
  }

  if (!isAdmin(currentUser)) {
    return NextResponse.json<ApiErrorResponse>(
      { error: "Apenas administradores podem visualizar usuarios." },
      { status: 403 }
    )
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  })

  return NextResponse.json<UsersListResponse>({
    users: users.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
    })),
  })
}
