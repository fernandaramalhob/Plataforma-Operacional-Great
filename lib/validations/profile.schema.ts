import { z } from "zod"

const NAME_MAX_LENGTH = 120
const PASSWORD_MIN_LENGTH = 6
const PASSWORD_MAX_LENGTH = 72

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

function isAllowedAvatarUrl(value: string) {
  return value.startsWith("data:image/") || value.startsWith("https://")
}

export const profileUpdateSchema = z
  .object({
    name: z.preprocess(
      trimString,
      z.string().min(1).max(NAME_MAX_LENGTH).optional()
    ),
    password: z.preprocess(
      trimString,
      z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).optional()
    ),
    avatarUrl: z.preprocess(
      (value) => {
        const trimmed = trimString(value)
        return trimmed === "" ? null : trimmed
      },
      z
        .string()
        .min(1)
        .refine(isAllowedAvatarUrl, "Avatar inválido")
        .nullable()
        .optional()
    ),
  })
  .strict()

export function getProfileValidationMessage() {
  return "Dados inválidos para atualizar o perfil"
}
