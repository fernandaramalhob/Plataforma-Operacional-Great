import { assert, test } from "./test-helpers.mjs"
import {
  buildAutomationReferenceWeekLabel,
  loadReportAutomationSettings,
  maskAutomationGroupId,
  resolveReportAutomationWindow,
} from "@/lib/report-automation"

test("resolveReportAutomationWindow returns the last completed week", () => {
  const window = resolveReportAutomationWindow({
    timezone: "America/Sao_Paulo",
    referenceDate: new Date("2026-04-01T12:00:00.000Z"),
  })

  assert.deepEqual(window, {
    since: "2026-03-23",
    until: "2026-03-29",
  })
  assert.equal(
    buildAutomationReferenceWeekLabel(window),
    "2026-03-23 ate 2026-03-29"
  )
})

test("loadReportAutomationSettings normalizes env values", () => {
  const settings = loadReportAutomationSettings({
    ADMIN_EMAIL: "Admin@GreatGo.com",
    REPORT_AUTOMATION_SEND_MODE: "message_only",
    REPORT_AUTOMATION_CONNECTED_ONLY: "false",
    REPORT_AUTOMATION_POLL_MAX_ATTEMPTS: "12",
  })

  assert.equal(settings.automationEmail, "admin@greatgo.com")
  assert.equal(settings.sendMode, "MESSAGE_ONLY")
  assert.equal(settings.connectedOnly, false)
  assert.equal(settings.pollingMaxAttempts, 12)
})

test("maskAutomationGroupId hides most of the whatsapp group id", () => {
  assert.equal(maskAutomationGroupId("120363407411420148@g.us"), "1203***g.us")
  assert.equal(maskAutomationGroupId(""), null)
})
