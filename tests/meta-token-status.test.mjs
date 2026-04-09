import { assert, test } from "./test-helpers.mjs"
import { getMetaTokenFromCandidates, resolveMetaTokenCandidate } from "@/lib/meta-token"
import { getMetaTokenReadErrorDetail } from "@/lib/meta-token-status"

test("getMetaTokenReadErrorDetail explica incompatibilidade de chave de criptografia", () => {
  const detail = getMetaTokenReadErrorDetail(
    new Error("Unsupported state or unable to authenticate data")
  )

  assert.match(detail, /NEXTAUTH_SECRET/)
  assert.match(detail, /PC de origem/)
})

test("getMetaTokenReadErrorDetail retorna fallback para erros genericos", () => {
  const detail = getMetaTokenReadErrorDetail(new Error("Falha inesperada"))

  assert.match(detail, /Nao foi possivel ler o token META salvo/i)
})

test("helper de token META prioriza META_ACCESS_TOKEN antes do banco", () => {
  const previousEnvToken = process.env.META_ACCESS_TOKEN

  process.env.META_ACCESS_TOKEN = "env-token-fixo"

  try {
    const candidate = resolveMetaTokenCandidate("token-do-banco")

    assert.equal(candidate?.token, "env-token-fixo")
    assert.equal(candidate?.source, "environment")
    assert.equal(getMetaTokenFromCandidates("token-do-banco"), "env-token-fixo")
  } finally {
    if (previousEnvToken === undefined) {
      delete process.env.META_ACCESS_TOKEN
    } else {
      process.env.META_ACCESS_TOKEN = previousEnvToken
    }
  }
})
