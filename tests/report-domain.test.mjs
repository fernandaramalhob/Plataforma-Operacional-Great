import { assert, test } from "./test-helpers.mjs"
import {
  buildStoredReportPayload,
  mapReportToHistoryRow,
  parsePendingReportJobPayload,
  parseReportJobErrorPayload,
  parseStoredReportPayload,
} from "@/lib/report-domain"

test("buildStoredReportPayload fills a fallback client when missing", () => {
  const payload = buildStoredReportPayload(
    {
      campaigns: [],
    },
    {
      since: "2026-03-01",
      until: "2026-03-25",
      objective: "ALL",
    },
    new Date("2026-03-25T10:00:00.000Z")
  )

  assert.equal(payload.client.name, "Cliente não informado")
  assert.equal(payload.filters.objective, "ALL")
})

test("parseStoredReportPayload returns null for invalid payload", () => {
  assert.equal(parseStoredReportPayload({ foo: "bar" }), null)
})

test("parseStoredReportPayload reads nested stored payload used by send retries", () => {
  const storedPayload = buildStoredReportPayload(
    {
      client: {
        id: "client-1",
        name: "Cliente Teste",
        company: "Empresa",
        adAccountId: "123456",
      },
      campaigns: [],
    },
    {
      since: "2026-03-01",
      until: "2026-03-25",
      objective: "ALL",
    },
    new Date("2026-03-25T10:00:00.000Z")
  )

  const parsed = parseStoredReportPayload({
    pendingJob: {
      kind: "SEND",
      queuedAt: "2026-03-25T10:00:00.000Z",
      requestedByUserId: "user-1",
      source: "schedule",
      filters: {
        since: "2026-03-01",
        until: "2026-03-25",
        objective: "ALL",
      },
      enqueueSendOnComplete: true,
      sendOptions: null,
      storedPayload,
    },
  })

  assert.equal(parsed?.client.name, "Cliente Teste")
  assert.equal(parsed?.filters.until, "2026-03-25")
})

test("parsePendingReportJobPayload normalizes legacy jobs", () => {
  const parsed = parsePendingReportJobPayload({
    pendingJob: {
      queuedAt: "2026-03-25T10:00:00.000Z",
      requestedByUserId: "user-1",
      source: "manual",
      filters: {
        since: "2026-03-01",
        until: "2026-03-25",
        objective: "ALL",
      },
      enqueueSendOnComplete: false,
      sendOptions: null,
    },
  })

  assert.equal(parsed?.kind, "GENERATION")
  assert.equal(parsed?.attemptCount, 0)
  assert.equal(parsed?.nextAttemptAt, "2026-03-25T10:00:00.000Z")
})

test("parseReportJobErrorPayload reads serialized job errors", () => {
  const jobError = parseReportJobErrorPayload({
    jobError: {
      message: "Falha ao enviar",
      stage: "SEND",
      failedAt: "2026-03-25T10:00:00.000Z",
    },
  })

  assert.deepEqual(jobError, {
    message: "Falha ao enviar",
    stage: "SEND",
    failedAt: "2026-03-25T10:00:00.000Z",
    scheduledAt: null,
    nextAttemptAt: null,
    groupId: null,
    groupName: null,
  })
})

test("mapReportToHistoryRow prioritizes the latest send log error", () => {
  const generatedAt = new Date("2026-03-25T10:00:00.000Z")
  const row = mapReportToHistoryRow({
    id: "report-1",
    clientId: "client-1",
    generatedAt,
    referenceWeek: generatedAt,
    status: "FAILED",
    payloadJson: {
      client: {
        id: "client-1",
        name: "Cliente Teste",
        company: "Empresa",
        adAccountId: "123456",
      },
      campaigns: [],
      filters: {
        since: "2026-03-01",
        until: "2026-03-25",
        objective: "ALL",
        generatedAt: "2026-03-25T10:00:00.000Z",
      },
      jobError: {
        message: "Erro do job",
        stage: "SEND",
        failedAt: "2026-03-25T10:00:00.000Z",
      },
    },
    client: {
      name: "Cliente Teste",
      company: "Empresa",
    },
    sendLogs: [
      {
        attemptNumber: 1,
        sentAt: null,
        errorMessage: "Primeira falha",
      },
      {
        attemptNumber: 2,
        sentAt: null,
        errorMessage: "Falha final",
      },
    ],
  })

  assert.equal(row.errorMessage, "Falha final")
  assert.equal(row.referenceWeek, "2026-03-01 até 2026-03-25")
})
