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

  assert.match(detail, /Não foi possível ler o token META salvo/i)
})

test("helper de token META prioriza o banco antes do META_ACCESS_TOKEN", () => {
  const previousEnvToken = process.env.META_ACCESS_TOKEN
  const previousSecret = process.env.NEXTAUTH_SECRET

  process.env.META_ACCESS_TOKEN = "env-token-fixo"
  process.env.NEXTAUTH_SECRET = "test-secret"

  try {
    const candidate = resolveMetaTokenCandidate("token-do-banco")

    assert.equal(candidate?.token, "token-do-banco")
    assert.equal(candidate?.source, "database")
    assert.equal(getMetaTokenFromCandidates("token-do-banco"), "token-do-banco")
  } finally {
    if (previousEnvToken === undefined) {
      delete process.env.META_ACCESS_TOKEN
    } else {
      process.env.META_ACCESS_TOKEN = previousEnvToken
    }

    if (previousSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET
    } else {
      process.env.NEXTAUTH_SECRET = previousSecret
    }
  }
})

test("helper de token META usa META_ACCESS_TOKEN quando nao ha token no banco", () => {
  const previousEnvToken = process.env.META_ACCESS_TOKEN
  const previousSecret = process.env.NEXTAUTH_SECRET

  process.env.META_ACCESS_TOKEN = "env-token-fixo"
  process.env.NEXTAUTH_SECRET = "test-secret"

  try {
    const candidate = resolveMetaTokenCandidate(null, undefined, "")

    assert.equal(candidate?.token, "env-token-fixo")
    assert.equal(candidate?.source, "environment")
    assert.equal(getMetaTokenFromCandidates(null, undefined, ""), "env-token-fixo")
  } finally {
    if (previousEnvToken === undefined) {
      delete process.env.META_ACCESS_TOKEN
    } else {
      process.env.META_ACCESS_TOKEN = previousEnvToken
    }

    if (previousSecret === undefined) {
      delete process.env.NEXTAUTH_SECRET
    } else {
      process.env.NEXTAUTH_SECRET = previousSecret
    }
  }
})
