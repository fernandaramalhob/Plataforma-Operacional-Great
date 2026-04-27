import { assert, test } from "./test-helpers.mjs"
import {
  getAuthLoginAccounts,
  getBootstrapLoginAccount,
} from "@/lib/auth-accounts"

test("getAuthLoginAccounts não expõe contas hardcoded sem configuração", () => {
  assert.deepEqual(getAuthLoginAccounts({}), [])
})

test("getAuthLoginAccounts inclui apenas contas explicitamente configuradas", () => {
  const accounts = getAuthLoginAccounts({
    ADMIN_EMAIL: " admin@greatgo.com ",
    ADMIN_PASSWORD: "senha-admin",
    DEV_BYPASS_AUTH_EMAIL: " gestor@empresa.com ",
    DEV_BYPASS_AUTH_NAME: "Gestor Teste",
    DEV_BYPASS_AUTH_PASSWORD: "senha-dev",
  })

  assert.deepEqual(
    accounts.map(({ email, name, role, password }) => ({
      email,
      name,
      role,
      password,
    })),
    [
      {
        email: "admin@greatgo.com",
        name: "Administrador",
        role: "ADMIN",
        password: "senha-admin",
      },
      {
        email: "gestor@empresa.com",
        name: "Gestor Teste",
        role: "MANAGER",
        password: "senha-dev",
      },
    ]
  )
})

test("getBootstrapLoginAccount retorna null sem credenciais explicitas", () => {
  assert.equal(getBootstrapLoginAccount("admin@greatgo.com", {}), null)
  assert.equal(getBootstrapLoginAccount("gestor@empresa.com", {}), null)
})
