import { assert, test } from "./test-helpers.mjs"
import {
  pollSavedReportUntilReady,
  requestQueuedReport,
  sendReportToWhatsApp,
} from "@/lib/report-client"

const originalFetch = globalThis.fetch

test("requestQueuedReport posts the report filters", async () => {
  const calls = []

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init })

    return new Response(
      JSON.stringify({
        reportId: "report-1",
        status: "PENDING",
        generatedAt: "2026-03-25T10:00:00.000Z",
        referenceWeek: "2026-03-25T10:00:00.000Z",
        queued: true,
      }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    )
  }

  const response = await requestQueuedReport({
    clientId: "4d72e88b-c954-40f3-9c20-a0d8ca8d2622",
    since: "2026-03-01",
    until: "2026-03-25",
    objective: "ALL",
  })

  assert.equal(response.reportId, "report-1")
  assert.equal(calls[0]?.input, "/api/reports")
  assert.equal(calls[0]?.init?.method, "POST")
  globalThis.fetch = originalFetch
})

test("pollSavedReportUntilReady resolves when payload becomes available", async () => {
  const responses = [
    {
      id: "report-1",
      status: "PENDING",
      generatedAt: "2026-03-25T10:00:00.000Z",
      referenceWeek: "2026-03-25T10:00:00.000Z",
      payload: null,
      errorMessage: null,
    },
    {
      id: "report-1",
      status: "SENT",
      generatedAt: "2026-03-25T10:00:00.000Z",
      referenceWeek: "2026-03-25T10:00:00.000Z",
      payload: {
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
      },
      errorMessage: null,
    },
  ]
  const updates = []

  globalThis.fetch = async () =>
    new Response(JSON.stringify(responses.shift()), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })

  const result = await pollSavedReportUntilReady({
    reportId: "report-1",
    sequence: 1,
    getCurrentSequence: () => 1,
    sleep: async () => {},
    onUpdate: (report) => {
      updates.push(report.status)
    },
  })

  assert.equal(result?.payload?.client.name, "Cliente Teste")
  assert.deepEqual(updates, ["PENDING", "SENT"])
  globalThis.fetch = originalFetch
})

test("sendReportToWhatsApp posts to the send endpoint", async () => {
  const calls = []

  globalThis.fetch = async (input, init) => {
    calls.push({ input, init })

    return new Response(
      JSON.stringify({
        ok: true,
        queued: false,
        reportId: "report-1",
        jobId: null,
        status: "SENT",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    )
  }

  const response = await sendReportToWhatsApp("report-1", {
    mode: "PDF_AND_MESSAGE",
    message: "Resumo customizado",
  })

  assert.equal(response.jobId, null)
  assert.equal(response.reportId, "report-1")
  assert.equal(calls[0]?.input, "/api/reports/report-1/send")
  assert.equal(calls[0]?.init?.method, "POST")
  assert.match(calls[0]?.init?.body ?? "", /PDF_AND_MESSAGE/)
  globalThis.fetch = originalFetch
})
