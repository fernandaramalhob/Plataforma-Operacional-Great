export type AuthRole = "ADMIN" | "MANAGER"

export type AuthLoginAccount = {
  id: string
  name: string
  email: string
  role: AuthRole
  password: string
}

export const DEFAULT_LOGIN_PASSWORD = "123456"

function readEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim()
  return normalizedValue ? normalizedValue : ""
}

export function getAuthLoginAccounts(): AuthLoginAccount[] {
  const accounts: AuthLoginAccount[] = [
    {
      id: "admin",
      name: "Administrador",
      email: readEnvValue(process.env.ADMIN_EMAIL) || "admin@greatgo.com",
      role: "ADMIN",
      password: readEnvValue(process.env.ADMIN_PASSWORD) || DEFAULT_LOGIN_PASSWORD,
    },
    {
      id: "manager-default",
      name: readEnvValue(process.env.DEV_BYPASS_AUTH_NAME) || "Isaque Soares",
      email:
        readEnvValue(process.env.DEV_BYPASS_AUTH_EMAIL) ||
        "pedrojuan.mwdigital@gmail.com",
      role: "MANAGER",
      password: DEFAULT_LOGIN_PASSWORD,
    },
    {
      id: "brayton-maycon",
      name: "Brayton Maycon",
      email: "braytonmaycon5@gmail.com",
      role: "MANAGER",
      password: DEFAULT_LOGIN_PASSWORD,
    },
  ]

  return accounts.filter((account, index, current) => {
    return current.findIndex((entry) => entry.email === account.email) === index
  })
}
