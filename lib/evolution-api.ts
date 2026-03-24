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

export async function sendWhatsAppText(params: {
  number: string
  text: string
}) {
  const apiUrl = getRequiredEnv("EVOLUTION_API_URL").replace(/\/+$/, "")
  const apiKey = getRequiredEnv("EVOLUTION_API_KEY")
  const instance = getRequiredEnv("EVOLUTION_INSTANCE")

  const response = await fetch(`${apiUrl}/message/sendText/${instance}`, {
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

  const data = (await response.json().catch(() => ({}))) as
    | EvolutionSendTextResponse
    | { error?: string; message?: string }

  if (!response.ok) {
    throw new Error(
      ("error" in data && typeof data.error === "string" && data.error) ||
        ("message" in data && typeof data.message === "string" && data.message) ||
        "Falha ao enviar mensagem pela Evolution API"
    )
  }

  return data
}
