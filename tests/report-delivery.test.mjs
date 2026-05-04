import { assert, test } from "./test-helpers.mjs"
import {
  assertReportSendAuthorized,
  isAutomaticSendAllowed,
} from "@/lib/report-delivery"

test("isAutomaticSendAllowed aceita fontes automaticas agendadas", () => {
  assert.equal(isAutomaticSendAllowed("schedule"), true)
  assert.equal(isAutomaticSendAllowed("weekly"), true)
})

test("isAutomaticSendAllowed bloqueia fonte manual", () => {
  assert.equal(isAutomaticSendAllowed("manual"), false)
})

test("assertReportSendAuthorized aceita clique explicito no botao do WhatsApp", () => {
  assert.doesNotThrow(() => {
    assertReportSendAuthorized({
      type: "manual-whatsapp-button",
    })
  })
})

test("assertReportSendAuthorized aceita automacao agendada", () => {
  assert.doesNotThrow(() => {
    assertReportSendAuthorized({
      type: "scheduled-automation",
      source: "schedule",
    })
  })
})

test("assertReportSendAuthorized bloqueia envio automatico manual", () => {
  assert.throws(
    () =>
      assertReportSendAuthorized({
        type: "scheduled-automation",
        source: "manual",
      }),
    /Envio automatico bloqueado/
  )
})
