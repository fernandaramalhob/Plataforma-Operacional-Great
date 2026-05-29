import { z } from "zod"

const reportObjectiveSchema = z.enum([
  "ALL",
  "LINK_CLICKS",
  "CONVERSIONS",
  "MESSAGES",
])

const reportSectionVisibilitySchema = z
  .object({
    overview: z.boolean(),
    advancedMetrics: z.boolean(),
    chart: z.boolean(),
    campaignTable: z.boolean(),
    topAds: z.boolean(),
    gender: z.boolean(),
    insights: z.boolean(),
    summary: z.boolean(),
    notes: z.boolean(),
  })
  .strict()

const reportMetricVisibilitySchema = z
  .object({
    spend: z.boolean(),
    impressions: z.boolean(),
    reach: z.boolean(),
    clicks: z.boolean(),
    ctr: z.boolean(),
    cpc: z.boolean(),
    cpm: z.boolean(),
    conversationsStarted: z.boolean(),
    costPerConversation: z.boolean(),
    conversationRate: z.boolean(),
  })
  .strict()

const reportPresentationSchema = z
  .object({
    customTitle: z.preprocess(nullableToUndefined, z.string().optional()),
    executiveSummary: z.preprocess(nullableToUndefined, z.string().optional()),
    closingNotes: z.preprocess(nullableToUndefined, z.string().optional()),
    sections: reportSectionVisibilitySchema.optional(),
    metrics: reportMetricVisibilitySchema.optional(),
    insightsEnabled: z.boolean().optional(),
  })
  .strict()

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
  z.string().uuid("clientId inválido")
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
      presentation: reportPresentationSchema.optional(),
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
  return error.issues[0]?.message ?? "Parametros do relatório inválidos"
}
