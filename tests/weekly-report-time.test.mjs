import { assert, test } from "./test-helpers.mjs"
import {
  buildWeeklyReportWeekKey,
  resolveWeeklyReportTimeZone,
  resolveWeeklyReportWindow,
} from "@/lib/reporting/weekly-report-time"

test("resolveWeeklyReportWindow uses Recife timezone for the last completed week", () => {
  const window = resolveWeeklyReportWindow({
    timeZone: "America/Recife",
    referenceDate: new Date("2026-04-13T13:20:00.000Z"),
  })

  assert.deepEqual(window, {
    since: "2026-04-06",
    until: "2026-04-12",
  })
  assert.equal(buildWeeklyReportWeekKey(window), "2026-W15")
})

test("resolveWeeklyReportTimeZone prefers REPORT_TIMEZONE", () => {
  const timeZone = resolveWeeklyReportTimeZone({
    REPORT_TIMEZONE: "America/Recife",
    REPORT_AUTOMATION_TIMEZONE: "America/Sao_Paulo",
    REPORT_WEEKLY_TZ: "UTC",
  })

  assert.equal(timeZone, "America/Recife")
})
