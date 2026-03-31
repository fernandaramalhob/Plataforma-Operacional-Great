import { logIntegrationEvent } from "@/lib/integration-monitoring"
import type { EvolutionGroup } from "@/types/evolution.types"

type EvolutionSendTextResponse = {
  key?: {
    id?: string
    remoteJid?: string
  }
  status?: string
  messageTimestamp?: string
}

type EvolutionSendMediaResponse = EvolutionSendTextResponse

function getRequiredEnv(name: "EVOLUTION_API_URL" | "EVOLUTION_API_KEY" | "EVOLUTION_INSTANCE") {
  const value = normalizeEnvValue(process.env[name])

  if (!value) {
    throw new Error(`Configuracao ausente: ${name}`)
  }

  return value
}

function normalizeEnvValue(value: string | undefined) {
  if (!value) {
    return ""
  }

  return value.trim().replace(/^["']|["']$/g, "")
}

function maskWhatsAppDestination(number: string) {
  const normalized = number.trim()

  if (normalized.length <= 6) {
    return "[REDACTED]"
  }

  return `${normalized.slice(0, 4)}***${normalized.slice(-2)}`
}

function isEvolutionSendTextResponse(
  value: EvolutionSendTextResponse | { error?: string; message?: string } | null
): value is EvolutionSendTextResponse {
  return Boolean(
    value &&
      (("status" in value && typeof value.status === "string") ||
        ("messageTimestamp" in value &&
          typeof value.messageTimestamp === "string") ||
        ("key" in value && typeof value.key === "object"))
  )
}

export async function sendWhatsAppText(params: {
  number: string
  text: string
}) {
  const startedAt = Date.now()
  const maskedNumber = maskWhatsAppDestination(params.number)
  const apiUrl = getRequiredEnv("EVOLUTION_API_URL").replace(/\/+$/, "")
  const apiKey = getRequiredEnv("EVOLUTION_API_KEY")
  const instance = getRequiredEnv("EVOLUTION_INSTANCE")
  let response: Response | null = null
  let data:
    | EvolutionSendTextResponse
    | { error?: string; message?: string }
    | null = null

  try {
    response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: params.number,
        text: params.text,
        delay: 1200,
        linkPreview: true,
      }),
      cache: "no-store",
    })

    data = (await response.json().catch(() => ({}))) as
      | EvolutionSendTextResponse
      | { error?: string; message?: string }

    if (!response.ok) {
      throw new Error(
        ("error" in data && typeof data.error === "string" && data.error) ||
          ("message" in data && typeof data.message === "string" && data.message) ||
          "Falha ao enviar mensagem pela Evolution API"
      )
    }

    logIntegrationEvent({
      integration: "whatsapp",
      action: "send-text",
      status: "success",
      durationMs: Date.now() - startedAt,
      details: {
        destination: maskedNumber,
        statusCode: response.status,
        deliveryStatus: isEvolutionSendTextResponse(data) ? data.status ?? null : null,
        messageId:
          isEvolutionSendTextResponse(data) && data.key
            ? data.key.id ?? null
            : null,
      },
    })

    return data
  } catch (error) {
    logIntegrationEvent({
      integration: "whatsapp",
      action: "send-text",
      status: "failure",
      durationMs: Date.now() - startedAt,
      details: {
        destination: maskedNumber,
        statusCode: response?.status ?? null,
        deliveryStatus:
          data && "status" in data && typeof data.status === "string"
            ? data.status
            : null,
      },
      error,
    })

    throw error
  }
}

export async function sendWhatsAppDocument(params: {
  number: string
  fileName: string
  contentBase64: string
  caption?: string | null
}) {
  const startedAt = Date.now()
  const maskedNumber = maskWhatsAppDestination(params.number)
  const apiUrl = getRequiredEnv("EVOLUTION_API_URL").replace(/\/+$/, "")
  const apiKey = getRequiredEnv("EVOLUTION_API_KEY")
  const instance = getRequiredEnv("EVOLUTION_INSTANCE")
  let response: Response | null = null
  let data:
    | EvolutionSendMediaResponse
    | { error?: string; message?: string }
    | null = null

  try {
    response = await fetch(`${apiUrl}/message/sendMedia/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      body: JSON.stringify({
        number: params.number,
        mediatype: "document",
        mimetype: "application/pdf",
        fileName: params.fileName,
        media: params.contentBase64,
        caption: params.caption ?? undefined,
      }),
      cache: "no-store",
    })

    data = (await response.json().catch(() => ({}))) as
      | EvolutionSendMediaResponse
      | { error?: string; message?: string }

    if (!response.ok) {
      throw new Error(
        ("error" in data && typeof data.error === "string" && data.error) ||
          ("message" in data && typeof data.message === "string" && data.message) ||
          "Falha ao enviar PDF pela Evolution API"
      )
    }

    logIntegrationEvent({
      integration: "whatsapp",
      action: "send-document",
      status: "success",
      durationMs: Date.now() - startedAt,
      details: {
        destination: maskedNumber,
        statusCode: response.status,
        fileName: params.fileName,
      },
    })

    return data
  } catch (error) {
    logIntegrationEvent({
      integration: "whatsapp",
      action: "send-document",
      status: "failure",
      durationMs: Date.now() - startedAt,
      details: {
        destination: maskedNumber,
        statusCode: response?.status ?? null,
        fileName: params.fileName,
      },
      error,
    })

    throw error
  }
}

type EvolutionGroupResponseItem = {
  id?: string
  subject?: string
  subjectOwner?: string
  size?: number
  participants?: unknown[]
  announce?: boolean
}

export function getEvolutionConfig() {
  const apiUrl = normalizeEnvValue(process.env.EVOLUTION_API_URL)
  const apiKey = normalizeEnvValue(process.env.EVOLUTION_API_KEY)
  const instance = normalizeEnvValue(process.env.EVOLUTION_INSTANCE)

  return {
    apiUrl,
    apiKey,
    instance,
    configured: Boolean(apiUrl && apiKey && instance),
  }
}

export async function listEvolutionGroups() {
  const startedAt = Date.now()
  const { apiUrl, apiKey, instance, configured } = getEvolutionConfig()

  if (!configured) {
    throw new Error(
      "Configure EVOLUTION_API_URL, EVOLUTION_API_KEY e EVOLUTION_INSTANCE para listar os grupos."
    )
  }

  let response: Response | null = null

  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, "")}/group/fetchAllGroups/${instance}?getParticipants=false`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      cache: "no-store",
    })

    const data = (await response.json().catch(() => [])) as
      | EvolutionGroupResponseItem[]
      | { error?: string; message?: string }

    if (!response.ok || !Array.isArray(data)) {
      throw new Error(
        (typeof data === "object" &&
          data !== null &&
          (("error" in data && typeof data.error === "string" && data.error) ||
            ("message" in data && typeof data.message === "string" && data.message))) ||
          "Falha ao listar grupos na Evolution API"
      )
    }

    const groups: EvolutionGroup[] = data
      .map((group) => {
        const id = typeof group.id === "string" ? group.id.trim() : ""

        if (!id) {
          return null
        }

        return {
          id,
          subject:
            typeof group.subject === "string" && group.subject.trim()
              ? group.subject.trim()
              : "Grupo sem nome",
          size:
            typeof group.size === "number"
              ? group.size
              : Array.isArray(group.participants)
                ? group.participants.length
                : 0,
          announce: Boolean(group.announce),
        } satisfies EvolutionGroup
      })
      .filter((group): group is EvolutionGroup => Boolean(group))
      .sort((left, right) => left.subject.localeCompare(right.subject, "pt-BR"))

    logIntegrationEvent({
      integration: "whatsapp",
      action: "list-groups",
      status: "success",
      durationMs: Date.now() - startedAt,
      details: {
        instance,
        statusCode: response.status,
        groupsCount: groups.length,
      },
    })

    return groups
  } catch (error) {
    logIntegrationEvent({
      integration: "whatsapp",
      action: "list-groups",
      status: "failure",
      durationMs: Date.now() - startedAt,
      details: {
        instance,
        statusCode: response?.status ?? null,
      },
      error,
    })

    throw error
  }
}
