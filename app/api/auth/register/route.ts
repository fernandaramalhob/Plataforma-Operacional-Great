import { NextResponse } from "next/server"
import { hashPassword } from "@/lib/password"
import { getCurrentUser, isAdmin } from "@/lib/authorization"
import { prisma } from "@/lib/prisma"

type RegisterPayload = {
  name?: string
  email?: string
  password?: string
  role?: "ADMIN" | "MANAGER"
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser()

  if (!currentUser) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  if (!isAdmin(currentUser)) {
    return NextResponse.json(
      { error: "Apenas administradores podem cadastrar usuarios." },
      { status: 403 }
    )
  }

  let payload: RegisterPayload

  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: "Payload invalido" }, { status: 400 })
  }

  const name = payload.name?.trim()
  const email = payload.email ? normalizeEmail(payload.email) : ""
  const password = payload.password?.trim() ?? ""
  const role = payload.role === "ADMIN" ? "ADMIN" : "MANAGER"

  if (!name || !email || !password) {
    return NextResponse.json({ error: "Preencha todos os campos" }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha deve ter no minimo 6 caracteres" },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (existingUser) {
    return NextResponse.json({ error: "Ja existe um usuario com esse e-mail" }, { status: 409 })
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

  return NextResponse.json({
    success: true,
    user,
  })
}
