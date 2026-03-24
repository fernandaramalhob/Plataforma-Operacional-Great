import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import {
  generateLiveReportPayload,
  persistGeneratedReport,
} from "@/lib/report-service"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get("clientId")
    const since = searchParams.get("since")
    const until = searchParams.get("until")
    const objective = searchParams.get("objective")

    if (!clientId) {
      return NextResponse.json({ error: "clientId obrigatorio" }, { status: 400 })
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { manager: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    if (!since || !until) {
      return NextResponse.json(
        { error: "since e until sao obrigatorios" },
        { status: 400 }
      )
    }

    const payload = await generateLiveReportPayload({
      user,
      client,
      filters: {
        since,
        until,
        objective: objective ?? "ALL",
      },
    })

    return NextResponse.json(payload)
  } catch (error) {
    logError("reports.get", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = (await request.json()) as {
      clientId?: string
      since?: string
      until?: string
      objective?: string
    }

    const clientId = typeof body.clientId === "string" ? body.clientId : ""
    const since = typeof body.since === "string" ? body.since : ""
    const until = typeof body.until === "string" ? body.until : ""
    const objective = typeof body.objective === "string" ? body.objective : "ALL"

    if (!clientId || !since || !until) {
      return NextResponse.json(
        { error: "clientId, since e until sao obrigatorios" },
        { status: 400 }
      )
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { manager: true },
    })

    if (!client) {
      return NextResponse.json({ error: "Cliente nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este cliente" }, { status: 403 })
    }

    const payload = await generateLiveReportPayload({
      user,
      client,
      filters: { since, until, objective },
    })
    const response = await persistGeneratedReport({
      clientId,
      payload,
      filters: { since, until, objective },
    })

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    logError("reports.post", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
