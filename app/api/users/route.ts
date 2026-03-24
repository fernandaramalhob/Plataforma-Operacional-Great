import { NextResponse } from "next/server"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

export async function GET() {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  if (!isAdmin(currentUser)) {
    return NextResponse.json(
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

  return NextResponse.json({ users })
}
