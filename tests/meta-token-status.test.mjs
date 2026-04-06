import { assert, test } from "./test-helpers.mjs"
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

  assert.match(detail, /Não foi possível ler o token META salvo/)
})
