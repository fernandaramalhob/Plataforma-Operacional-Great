import { assert, test } from "./test-helpers.mjs"
import { buildStandardReportPdfBuffer } from "@/lib/report-pdf-standard"

test("buildStandardReportPdfBuffer gera um PDF padrão não vazio", () => {
  const buffer = buildStandardReportPdfBuffer({
    reportId: "report-1",
    payload: {
      client: {
        id: "client-1",
        name: "Cliente Teste",
        company: "Empresa Teste",
        adAccountId: "123456789",
      },
      filters: {
        since: "2026-03-18",
        until: "2026-03-25",
        objective: "ALL",
        generatedAt: "2026-03-25T10:00:00.000Z",
      },
      campaigns: [
        {
          id: "camp-1",
          name: "Campanha A",
          status: "ACTIVE",
          objective: "LINK_CLICKS",
          insights: {
            data: [
              {
                spend: "10",
                impressions: "100",
                clicks: "5",
              },
            ],
          },
        },
      ],
      accountInsights: {
        spend: "10",
        impressions: "100",
        reach: "80",
        clicks: "5",
        ctr: "5",
        cpc: "2",
        cpm: "100",
      },
      dailyInsights: [],
    },
  })

  assert.equal(Buffer.isBuffer(buffer), true)
  assert.ok(buffer.length > 1000)
})
