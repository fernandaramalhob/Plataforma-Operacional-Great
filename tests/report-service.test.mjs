import { assert, test } from "./test-helpers.mjs"
import { buildPendingReportJobPayload } from "@/lib/report-domain"
import { shouldReuseAutomatedQueuedReport } from "@/lib/report-service"

function buildCandidate(overrides = {}) {
  return {
    queuedAt: "2026-05-04T13:00:00.000Z",
    scheduledSendAt: "2026-05-04T13:15:00.000Z",
    requestedByUserId: "user-1",
    source: "schedule",
    filters: {
      since: "2026-04-28",
      until: "2026-05-04",
      objective: "ALL",
    },
    enqueueSendOnComplete: true,
    sendOptions: {
      mode: "PDF_AND_MESSAGE",
      message: null,
      groupId: "120363407411420148@g.us",
    },
    ...overrides,
  }
}

test("shouldReuseAutomatedQueuedReport reaproveita agendamento pendente identico", () => {
  const candidate = buildCandidate()

  assert.equal(
    shouldReuseAutomatedQueuedReport(
      {
        status: "PENDING",
        payloadJson: buildPendingReportJobPayload(candidate),
      },
      candidate
    ),
    true
  )
})

test("shouldReuseAutomatedQueuedReport bloqueia reenvio de automacao ja enviada", () => {
  const candidate = buildCandidate({
    source: "weekly",
    scheduledSendAt: null,
  })

  assert.equal(
    shouldReuseAutomatedQueuedReport(
      {
        status: "SENT",
        payloadJson: null,
      },
      candidate
    ),
    true
  )
})

test("shouldReuseAutomatedQueuedReport nao reaproveita agendamentos diferentes", () => {
  const candidate = buildCandidate()

  assert.equal(
    shouldReuseAutomatedQueuedReport(
      {
        status: "PENDING",
        payloadJson: buildPendingReportJobPayload(
          buildCandidate({
            scheduledSendAt: "2026-05-04T13:30:00.000Z",
          })
        ),
      },
      candidate
    ),
    false
  )
})

test("shouldReuseAutomatedQueuedReport nao interfere em filas manuais", () => {
  const candidate = buildCandidate({
    source: "manual",
  })

  assert.equal(
    shouldReuseAutomatedQueuedReport(
      {
        status: "SENT",
        payloadJson: null,
      },
      candidate
    ),
    false
  )
})
