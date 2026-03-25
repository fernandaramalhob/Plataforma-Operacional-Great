import { logIntegrationEvent } from "@/lib/integration-monitoring"

type EvolutionSendTextResponse = {
  key?: {
    id?: string
    remoteJid?: string
  }
  status?: string
  messageTimestamp?: string
}

function getRequiredEnv(name: "EVOLUTION_API_URL" | "EVOLUTION_API_KEY" | "EVOLUTION_INSTANCE") {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Configuracao ausente: ${name}`)
  }

  return value
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
