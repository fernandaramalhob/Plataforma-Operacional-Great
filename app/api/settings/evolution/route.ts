import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/authorization"
import { getEvolutionConfig, loadEvolutionCatalog } from "@/lib/evolution-api"
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
        instances: [],
      })
    }

    try {
      const catalog = await loadEvolutionCatalog()
      const connectedInstances = catalog.instances.filter(
        (instance) => instance.status === null || instance.status === "open"
      )
      const detail =
        catalog.groups.length > 0
          ? `${catalog.groups.length} grupo(s) encontrado(s) em ${connectedInstances.length || 1} instancia(s).`
          : "Conexao com a Evolution ativa, mas nenhum grupo foi encontrado."

      return NextResponse.json<EvolutionSettingsResponse>({
        configured: true,
        connected: catalog.connected,
        instance: config.instance,
        detail:
          catalog.partialErrors.length > 0
            ? `${detail} Algumas instancias nao puderam ser consultadas nesta atualizacao.`
            : detail,
        groups: catalog.groups,
        instances: catalog.instances,
      })
    } catch (error) {
      return NextResponse.json<EvolutionSettingsResponse>({
        configured: true,
        connected: false,
        instance: config.instance,
        detail: error instanceof Error ? error.message : "Falha ao consultar a Evolution API.",
        groups: [],
        instances: [],
      })
    }
  } catch (error) {
    logError("settings.evolution.get", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
