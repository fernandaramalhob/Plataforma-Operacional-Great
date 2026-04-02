import { assert, test } from "./test-helpers.mjs"
import { registerUserSchema } from "@/lib/validations/auth.schema"
import { profileUpdateSchema } from "@/lib/validations/profile.schema"

test("registerUserSchema aceita cadastro de gestor sem role", () => {
  const result = registerUserSchema.safeParse({
    name: "Gestor Teste",
    email: "gestor@empresa.com",
    password: "123456",
  })

  assert.equal(result.success, true)
})

test("registerUserSchema rejeita tentativa de enviar role", () => {
  const result = registerUserSchema.safeParse({
    name: "Admin Invalido",
    email: "admin@empresa.com",
    password: "123456",
    role: "ADMIN",
  })

  assert.equal(result.success, false)
})

test("profileUpdateSchema rejeita senha curta", () => {
  const result = profileUpdateSchema.safeParse({
    password: "123",
  })

  assert.equal(result.success, false)
})

test("profileUpdateSchema aceita avatar em data url", () => {
  const result = profileUpdateSchema.safeParse({
    avatarUrl: "data:image/png;base64,Zm9v",
  })

  assert.equal(result.success, true)
})

test("profileUpdateSchema rejeita avatar inseguro", () => {
  const result = profileUpdateSchema.safeParse({
    avatarUrl: "javascript:alert(1)",
  })

  assert.equal(result.success, false)
})
