import { assert, test } from "./test-helpers.mjs"
import {
  fetchJsonOrThrow,
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/api-client"

const originalFetch = globalThis.fetch

test("readJsonResponse parses JSON payloads", async () => {
  const response = new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

  const data = await readJsonResponse(response)

  assert.deepEqual(data, { ok: true })
})

test("getApiErrorMessage prefers detail over error", () => {
  assert.equal(
    getApiErrorMessage(
      { error: "Fallback", detail: "Mensagem detalhada" },
      "Padrão"
    ),
    "Mensagem detalhada"
  )
})

test("fetchJsonOrThrow returns parsed data on success", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ id: "123" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })

  const data = await fetchJsonOrThrow("/api/test", undefined, "Erro")

  assert.deepEqual(data, { id: "123" })
  globalThis.fetch = originalFetch
})

test("fetchJsonOrThrow throws API detail on failure", async () => {
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: "Erro", detail: "Token invalido" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })

  await assert.rejects(
    () => fetchJsonOrThrow("/api/test", undefined, "Erro padrão"),
    /Token invalido/
  )

  globalThis.fetch = originalFetch
})
