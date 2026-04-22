import { z } from "zod"

const ACCOUNT_NAME_MAX_LENGTH = 120
const ACCOUNT_ID_MAX_LENGTH = 32

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

export const metaTokenSchema = z
  .union([
    z
      .object({
        token: z.preprocess(
          trimString,
          z.string().min(1, "Token META obrigatorio")
        ),
      })
      .strict(),
    z
      .object({
        preset: z.enum(["ISAQUE", "BRAYTON"]),
      })
      .strict(),
  ])
  .refine((value) => {
    if ("token" in value) {
      return Boolean(value.token.trim())
    }

    return true
  }, "Token META obrigatorio")

export const importClientSchema = z
  .object({
    adAccountId: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Conta META obrigatoria")
        .max(
          ACCOUNT_ID_MAX_LENGTH,
          `Conta META deve ter no maximo ${ACCOUNT_ID_MAX_LENGTH} caracteres`
        )
    ),
    adAccountName: z.preprocess(
      trimString,
      z
        .string()
        .min(1, "Nome da conta META obrigatorio")
        .max(
          ACCOUNT_NAME_MAX_LENGTH,
          `Nome da conta META deve ter no maximo ${ACCOUNT_NAME_MAX_LENGTH} caracteres`
        )
    ),
  })
  .strict()

export function getMetaValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Dados da META invalidos"
}
