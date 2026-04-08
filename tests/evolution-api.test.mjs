import { assert, test } from "./test-helpers.mjs"
import {
  loadEvolutionCatalog,
  sendWhatsAppText,
} from "@/lib/evolution-api"

const originalFetch = globalThis.fetch
const originalEnv = {
  EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
  EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
  EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE,
}

function setEvolutionEnv() {
  process.env.EVOLUTION_API_URL = "https://evolution.example.com"
  process.env.EVOLUTION_API_KEY = "test-api-key"
  process.env.EVOLUTION_INSTANCE = "GreatGo"
}

function restoreEnvironment() {
  globalThis.fetch = originalFetch

  for (const [key, value] of Object.entries(originalEnv)) {
    if (value == null) {
      delete process.env[key]
      continue
    }

    process.env[key] = value
  }
}

test("loadEvolutionCatalog returns groups from every open instance", async () => {
  setEvolutionEnv()

  globalThis.fetch = async (input) => {
    const url = String(input)

    if (url.endsWith("/instance/fetchInstances")) {
      return new Response(
        JSON.stringify([
          { name: "GreatGo", status: "open" },
          { name: "NovaInstancia", status: "open" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (url.includes("/group/fetchAllGroups/GreatGo")) {
      return new Response(
        JSON.stringify([
          { id: "120@g.us", subject: "Grupo Antigo", size: 10, announce: false },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (url.includes("/group/fetchAllGroups/NovaInstancia")) {
      return new Response(
        JSON.stringify([
          { id: "999@g.us", subject: "Grupo Novo", size: 22, announce: true },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    throw new Error(`URL nao esperada no teste: ${url}`)
  }

  const catalog = await loadEvolutionCatalog()

  assert.equal(catalog.connected, true)
  assert.equal(catalog.instances.length, 2)
  assert.deepEqual(
    catalog.groups.map((group) => ({
      id: group.id,
      instance: group.instance,
    })),
    [
      { id: "120@g.us", instance: "GreatGo" },
      { id: "999@g.us", instance: "NovaInstancia" },
    ]
  )

  restoreEnvironment()
})

test("sendWhatsAppText resolves the instance from the group id", async () => {
  setEvolutionEnv()
  const requestedUrls = []

  globalThis.fetch = async (input, init) => {
    const url = String(input)
    requestedUrls.push(url)

    if (url.endsWith("/instance/fetchInstances")) {
      return new Response(
        JSON.stringify([
          { name: "GreatGo", status: "open" },
          { name: "NovaInstancia", status: "open" },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (url.includes("/group/fetchAllGroups/GreatGo")) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (url.includes("/group/fetchAllGroups/NovaInstancia")) {
      return new Response(
        JSON.stringify([
          { id: "999@g.us", subject: "Grupo Novo", size: 22, announce: false },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    if (url.endsWith("/message/sendText/NovaInstancia")) {
      assert.equal(init?.method, "POST")

      return new Response(
        JSON.stringify({
          status: "PENDING",
          key: {
            id: "msg-1",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    }

    throw new Error(`URL nao esperada no teste: ${url}`)
  }

  await sendWhatsAppText({
    number: "999@g.us",
    text: "Relatorio enviado",
  })

  assert.equal(
    requestedUrls.includes("https://evolution.example.com/message/sendText/NovaInstancia"),
    true
  )

  restoreEnvironment()
})
