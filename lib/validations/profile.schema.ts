import { z } from "zod"

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

export const profileUpdateSchema = z
  .object({
    name: z.preprocess(trimString, z.string().min(1).optional()),
    password: z.preprocess(trimString, z.string().min(1).optional()),
    avatarUrl: z.preprocess(
      (value) => {
        const trimmed = trimString(value)
        return trimmed === "" ? null : trimmed
      },
      z.string().min(1).nullable().optional()
    ),
  })
  .strict()

export function getProfileValidationMessage() {
  return "Dados invalidos para atualizar o perfil"
}
