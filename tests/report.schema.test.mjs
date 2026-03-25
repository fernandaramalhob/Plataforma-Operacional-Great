import { assert, test } from "./test-helpers.mjs"
import {
  getReportValidationMessage,
  reportRequestSchema,
} from "@/lib/validations/report.schema"

test("reportRequestSchema accepts valid filters", () => {
  const result = reportRequestSchema.parse({
    clientId: "4d72e88b-c954-40f3-9c20-a0d8ca8d2622",
    since: "2026-03-01",
    until: "2026-03-25",
    objective: "ALL",
  })

  assert.equal(result.objective, "ALL")
})

test("reportRequestSchema rejects inverted date ranges", () => {
  const result = reportRequestSchema.safeParse({
    clientId: "4d72e88b-c954-40f3-9c20-a0d8ca8d2622",
    since: "2026-03-25",
    until: "2026-03-01",
    objective: "ALL",
  })

  assert.equal(result.success, false)

  if (!result.success) {
    assert.equal(
      getReportValidationMessage(result.error),
      "A data final deve ser igual ou maior que a inicial"
    )
  }
})
