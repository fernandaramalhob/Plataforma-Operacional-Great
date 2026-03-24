import { NextResponse } from "next/server"
import { canAccessClient, getCurrentUser } from "@/lib/authorization"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

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
    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        client: {
          select: {
            managerId: true,
          },
        },
      },
    })

    if (!report) {
      return NextResponse.json({ error: "Relatorio nao encontrado" }, { status: 404 })
    }

    if (!canAccessClient(user, report.client.managerId)) {
      return NextResponse.json({ error: "Acesso negado a este relatorio" }, { status: 403 })
    }

    const payload = parseStoredReportPayload(report.payloadJson)

    if (!payload) {
      return NextResponse.json(
        { error: "Payload do relatorio esta invalido" },
        { status: 422 }
      )
    }

    return NextResponse.json({
      id: report.id,
      status: report.status,
      generatedAt: report.generatedAt.toISOString(),
      referenceWeek: report.referenceWeek.toISOString(),
      payload,
    })
  } catch (error) {
    logError("reports.by-id.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
