import { assert, test } from "./test-helpers.mjs"
import {
  createReportPdfAccessToken,
  verifyReportPdfAccessToken,
} from "@/lib/report-pdf-preview-server"

test("verifyReportPdfAccessToken aceita token valido do mesmo relatorio", () => {
  process.env.REPORT_PDF_RENDER_SECRET = "test-secret"

  const token = createReportPdfAccessToken("report-1", Date.now() + 60_000)

  assert.equal(verifyReportPdfAccessToken("report-1", token), true)
})

test("verifyReportPdfAccessToken rejeita token expirado ou de outro relatorio", () => {
  process.env.REPORT_PDF_RENDER_SECRET = "test-secret"

  const expiredToken = createReportPdfAccessToken("report-1", Date.now() - 1_000)
  const validToken = createReportPdfAccessToken("report-1", Date.now() + 60_000)

  assert.equal(verifyReportPdfAccessToken("report-1", expiredToken), false)
  assert.equal(verifyReportPdfAccessToken("report-2", validToken), false)
})
