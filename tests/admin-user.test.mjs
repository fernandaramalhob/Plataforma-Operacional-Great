import { assert, test } from "./test-helpers.mjs"
import {
  DEFAULT_ADMIN_EMAIL,
  getAdminBootstrapCredentials,
} from "@/lib/admin-user"

test("getAdminBootstrapCredentials prefere ADMIN_ quando presentes", () => {
  const result = getAdminBootstrapCredentials({
    ADMIN_EMAIL: "  admin@empresa.com  ",
    ADMIN_PASSWORD: "senha-forte",
    SEED_USER_EMAIL: "seed@empresa.com",
    SEED_USER_PASSWORD: "123456",
  })

  assert.deepEqual(result, {
    email: "admin@empresa.com",
    password: "senha-forte",
    name: "Administrador",
  })
})

test("getAdminBootstrapCredentials usa SEED_ como fallback", () => {
  const result = getAdminBootstrapCredentials({
    SEED_USER_EMAIL: "  seed@empresa.com  ",
    SEED_USER_PASSWORD: "123456",
  })

  assert.deepEqual(result, {
    email: "seed@empresa.com",
    password: "123456",
    name: "Administrador",
  })
})

test("getAdminBootstrapCredentials usa email padrao quando so a senha existe", () => {
  const result = getAdminBootstrapCredentials({
    ADMIN_PASSWORD: "senha-forte",
  })

  assert.deepEqual(result, {
    email: DEFAULT_ADMIN_EMAIL,
    password: "senha-forte",
    name: "Administrador",
  })
})

test("getAdminBootstrapCredentials retorna null sem senha", () => {
  const result = getAdminBootstrapCredentials({
    ADMIN_EMAIL: "admin@empresa.com",
  })

  assert.equal(result, null)
})
