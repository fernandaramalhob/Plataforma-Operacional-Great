import { z } from "zod"

const reportObjectiveSchema = z.enum([
  "ALL",
  "LINK_CLICKS",
  "CONVERSIONS",
  "MESSAGES",
])

function trimString(value: unknown) {
  return typeof value === "string" ? value.trim() : value
}

function nullableToUndefined(value: unknown) {
  return value === null ? undefined : value
}

const reportDateSchema = z.preprocess(
  trimString,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datas devem seguir o formato YYYY-MM-DD")
)

const reportClientIdSchema = z.preprocess(
  trimString,
  z.string().uuid("clientId invalido")
)

function buildReportSchema() {
  return z
    .object({
      clientId: reportClientIdSchema,
      since: reportDateSchema,
      until: reportDateSchema,
      objective: z.preprocess(
        (value) => {
          const normalized = nullableToUndefined(trimString(value))
          return normalized === "" ? undefined : normalized
        },
        reportObjectiveSchema.optional().default("ALL")
      ),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.since > data.until) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["until"],
          message: "A data final deve ser igual ou maior que a inicial",
        })
      }
    })
}

export const reportRequestSchema = buildReportSchema()
export const reportQuerySchema = buildReportSchema()

export function getReportValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message ?? "Parametros do relatorio invalidos"
}
