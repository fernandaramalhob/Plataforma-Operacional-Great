import { assert, test } from "./test-helpers.mjs"
import {
  clientPayloadSchema,
  getClientValidationMessage,
} from "@/lib/validations/client.schema"

test("clientPayloadSchema normalizes optional values", () => {
  const result = clientPayloadSchema.parse({
    name: "  Cliente Teste  ",
    company: "  Empresa  ",
    email: "contato@empresa.com",
    phone: "(11) 99999-9999",
    notes: "  observacao interna  ",
    whatsappGroupId: "5511999999999-1234567890@g.us",
    adAccountId: "1234567890",
    adAccountName: "Conta Principal",
  })

  assert.equal(result.name, "Cliente Teste")
  assert.equal(result.company, "Empresa")
  assert.equal(result.notes, "observacao interna")
})

test("clientPayloadSchema rejects invalid phone numbers", () => {
  const result = clientPayloadSchema.safeParse({
    name: "Cliente Teste",
    phone: "123",
  })

  assert.equal(result.success, false)

  if (!result.success) {
    assert.equal(
      getClientValidationMessage(result.error),
      "Telefone deve ter entre 10 e 15 digitos"
    )
  }
})

test("clientPayloadSchema requires META account id and name together", () => {
  const result = clientPayloadSchema.safeParse({
    name: "Cliente Teste",
    adAccountId: "1234567890",
  })

  assert.equal(result.success, false)
})
