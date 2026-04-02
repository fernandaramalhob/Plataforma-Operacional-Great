import { z } from "zod"

const NAME_MAX_LENGTH = 120
const EMAIL_MAX_LENGTH = 160
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 72

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : value
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido")
    .max(EMAIL_MAX_LENGTH),
  password: z
    .string()
    .trim()
    .min(PASSWORD_MIN_LENGTH, "Senha deve ter no mínimo 6 caracteres")
    .max(PASSWORD_MAX_LENGTH, "Senha deve ter no máximo 72 caracteres"),
})

export const registerUserSchema = z
  .object({
    name: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Preencha todos os campos")
        .max(NAME_MAX_LENGTH, `Nome deve ter no máximo ${NAME_MAX_LENGTH} caracteres`)
    ),
    email: z.preprocess(
      normalizeEmail,
      z
        .string()
        .email("E-mail inválido")
        .max(EMAIL_MAX_LENGTH, `E-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres`)
    ),
    password: z.preprocess(
      trimString,
      z
        .string()
        .min(PASSWORD_MIN_LENGTH, "A senha deve ter no mínimo 6 caracteres")
        .max(PASSWORD_MAX_LENGTH, "A senha deve ter no máximo 72 caracteres")
    ),
  })
  .strict()

export function getAuthValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados de autenticação inválidos"
}
