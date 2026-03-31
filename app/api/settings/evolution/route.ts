import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/authorization"
import { getEvolutionConfig, listEvolutionGroups } from "@/lib/evolution-api"
import { logError } from "@/lib/safe-logger"
import type { EvolutionSettingsResponse } from "@/types/evolution.types"

export async function GET() {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const config = getEvolutionConfig()

    if (!config.configured) {
      return NextResponse.json<EvolutionSettingsResponse>({
        configured: false,
        connected: false,
        instance: config.instance || null,
        detail:
          "Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE para habilitar o WhatsApp.",
        groups: [],
      })
    }

    try {
      const groups = await listEvolutionGroups()

      return NextResponse.json<EvolutionSettingsResponse>({
        configured: true,
        connected: true,
        instance: config.instance,
        detail:
          groups.length > 0
            ? `${groups.length} grupo(s) encontrado(s) na instancia ativa.`
            : "Instancia conectada, mas nenhum grupo foi encontrado.",
        groups,
      })
    } catch (error) {
      return NextResponse.json<EvolutionSettingsResponse>({
        configured: true,
        connected: false,
        instance: config.instance,
        detail: error instanceof Error ? error.message : "Falha ao consultar a Evolution API.",
        groups: [],
      })
    }
  } catch (error) {
    logError("settings.evolution.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
