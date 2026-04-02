import { z } from "zod"

const ACCOUNT_NAME_MAX_LENGTH = 120

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

export const metaTokenSchema = z
  .object({
    token: z.preprocess(
      trimString,
      z.string().min(1, "Token META obrigatório")
    ),
  })
  .strict()

export const importClientSchema = z
  .object({
    adAccountId: z.preprocess(
      trimString,
      z
        .string()
        .regex(/^\d{5,32}$/, "Conta META deve conter apenas números")
    ),
    adAccountName: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Nome da conta META obrigatório")
        .max(
          ACCOUNT_NAME_MAX_LENGTH,
          `Nome da conta META deve ter no máximo ${ACCOUNT_NAME_MAX_LENGTH} caracteres`
        )
    ),
  })
  .strict()

export function getMetaValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados da META inválidos"
}
