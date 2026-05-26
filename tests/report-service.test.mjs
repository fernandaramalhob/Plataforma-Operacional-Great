import { assert, test } from "./test-helpers.mjs"
import { buildPendingReportJobPayload } from "@/lib/report-domain"
import {
  shouldReuseAutomatedQueuedReport,
  shouldReuseExistingReportByFilters,
} from "@/lib/report-service"

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

test("shouldReuseExistingReportByFilters reaproveita relatorio concluido com os mesmos filtros", () => {
  const existing = {
    status: "SENT",
    payloadJson: {
      client: {
        id: "client-1",
        name: "Cliente Teste",
        company: "Empresa",
        adAccountId: "123456",
      },
      campaigns: [],
      filters: {
        since: "2026-04-28",
        until: "2026-05-04",
        objective: "ALL",
        generatedAt: "2026-05-04T13:00:00.000Z",
      },
    },
  }

  assert.equal(
    shouldReuseExistingReportByFilters(existing, {
      since: "2026-04-28",
      until: "2026-05-04",
      objective: "ALL",
    }),
    true
  )
})

test("shouldReuseExistingReportByFilters nao reaproveita relatorio falho", () => {
  assert.equal(
    shouldReuseExistingReportByFilters(
      {
        status: "FAILED",
        payloadJson: null,
      },
      {
        since: "2026-04-28",
        until: "2026-05-04",
        objective: "ALL",
      }
    ),
    false
  )
})
