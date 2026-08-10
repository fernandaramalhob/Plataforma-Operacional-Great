import { assert, test } from "./test-helpers.mjs"
import { MetaApiError } from "@/lib/meta-api"
import { isMetaPermissionError } from "@/lib/report-service"
import { isPermanentMetaPermissionError } from "@/lib/report-processing"

test("classifica erro de token Meta nao confirmado como permanente", () => {
  const message =
    "Sessions for the user are not allowed because the user is not a confirmed user."

  assert.equal(isPermanentMetaPermissionError(message), true)
  assert.equal(
    isMetaPermissionError(
      new MetaApiError({
        message,
        status: 400,
        code: 190,
        errorType: "OAuthException",
      })
    ),
    true
  )
})

test("classifica erro de validacao de token Meta como permanente", () => {
  const message = "Error validating access token: The session is invalid"

  assert.equal(isPermanentMetaPermissionError(message), true)
  assert.equal(
    isMetaPermissionError(
      new MetaApiError({
        message,
        status: 400,
        code: 190,
        errorType: "OAuthException",
      })
    ),
    true
  )
})

test("mantem erros temporarios fora da classificacao permanente", () => {
  const message = "Tempo limite ao consultar a META API (30000 ms) em /me"

  assert.equal(isPermanentMetaPermissionError(message), false)
  assert.equal(
    isMetaPermissionError(
      new MetaApiError({
        message,
        status: 504,
      })
    ),
    false
  )
})
