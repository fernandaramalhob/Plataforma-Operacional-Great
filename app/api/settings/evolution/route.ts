import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/authorization"
import { getEvolutionConfig, loadEvolutionCatalog } from "@/lib/evolution-api"
import { normalizeEvolutionInstancePreference } from "@/lib/evolution-preference"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"
import type { EvolutionSettingsResponse } from "@/types/evolution.types"

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const requestUrl = new URL(request.url)
    const previewInstance = normalizeEvolutionInstancePreference(
      requestUrl.searchParams.get("previewInstance")
    )
    const selectedInstance = normalizeEvolutionInstancePreference(
      user.evolutionInstance ?? null
    )
    const config = getEvolutionConfig()
    const effectiveGroupInstance = previewInstance || selectedInstance || config.instance || null

    if (!config.configured) {
      return NextResponse.json<EvolutionSettingsResponse>({
        configured: false,
        connected: false,
        instance: config.instance || null,
        selectedInstance,
        previewInstance: effectiveGroupInstance,
        detail:
          "Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE para habilitar o WhatsApp.",
        groups: [],
        instances: [],
      })
    }

    try {
      const catalog = await loadEvolutionCatalog({
        groupInstances: effectiveGroupInstance ? [effectiveGroupInstance] : undefined,
      })
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
        instance: selectedInstance || config.instance || null,
        selectedInstance,
        previewInstance: effectiveGroupInstance,
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
        instance: selectedInstance || config.instance || null,
        selectedInstance,
        previewInstance: effectiveGroupInstance,
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

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      selectedInstance?: string | null
    }
    const selectedInstance = normalizeEvolutionInstancePreference(body.selectedInstance ?? null)

    if (selectedInstance) {
      const catalog = await loadEvolutionCatalog()
      const isAvailable = catalog.instances.some(
        (instance) =>
          instance.name === selectedInstance &&
          (instance.status === null || instance.status === "open")
      )

      if (!isAvailable) {
        return NextResponse.json(
          { error: "Instancia Evolution nao encontrada ou indisponivel" },
          { status: 400 }
        )
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        evolutionInstance: selectedInstance,
      },
    })

    return NextResponse.json<EvolutionSettingsResponse>({
      configured: true,
      connected: true,
      instance: null,
      selectedInstance,
      detail: selectedInstance
        ? `Instancia ${selectedInstance} salva para esta conta.`
        : "Instancia padrao da Evolution restaurada para esta conta.",
      groups: [],
      instances: [],
    })
  } catch (error) {
    logError("settings.evolution.post", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro interno" },
      { status: 500 }
    )
  }
}
