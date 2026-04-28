import { z } from "zod"

const reportScheduleFrequencySchema = z.enum(["ONCE", "WEEKLY"])

export const reportSchedulePayloadSchema = z
  .object({
    frequency: reportScheduleFrequencySchema,
    weekday: z.number().int().min(0).max(6).nullable().optional(),
    scheduledDate: z.string().trim().nullable().optional(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    filtersSince: z.string().trim().min(1, "Informe a data inicial."),
    filtersUntil: z.string().trim().min(1, "Informe a data final."),
    objective: z.string().trim().min(1).default("ALL"),
    sendMode: z.enum(["PDF_AND_MESSAGE", "PDF_ONLY", "MESSAGE_ONLY"]),
    message: z.string().trim().max(4000).nullable().optional(),
    groupId: z.string().trim().max(255).nullable().optional(),
    active: z.boolean().optional().default(true),
  })
  .superRefine((data, ctx) => {
    if (data.frequency === "WEEKLY" && data.weekday == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["weekday"],
        message: "Selecione o dia da semana.",
      })
    }

    if (data.frequency === "ONCE" && !data.scheduledDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scheduledDate"],
        message: "Selecione a data do envio.",
      })
    }
  })

export function getReportScheduleValidationMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Dados do agendamento inválidos."
}
