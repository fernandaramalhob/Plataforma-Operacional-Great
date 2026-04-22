const clientLookup = [
  { id: "client-a", name: "Paula Manually Great" },
  { id: "client-b", name: "Camila Lucarelli Great" },
]

const historyRows = [
  {
    id: "report-sent",
    date: "20/04/2026",
    time: "17:37",
    clientId: "client-a",
    client: "Paula Manually Great",
    company: "Great Labs",
    status: "SENT",
    attempts: 1,
    errorMessage: null,
    referenceWeek: "2026-04-13 até 2026-04-20",
  },
  {
    id: "report-failed",
    date: "20/04/2026",
    time: "15:25",
    clientId: "client-b",
    client: "Camila Lucarelli Great",
    company: "Lucarelli Studio",
    status: "FAILED",
    attempts: 2,
    errorMessage: "Falha ao enviar o PDF.",
    referenceWeek: "2026-04-13 até 2026-04-20",
  },
  {
    id: "report-pending",
    date: "20/04/2026",
    time: "15:14",
    clientId: "client-a",
    client: "Paula Manually Great",
    company: "Great Labs",
    status: "PENDING",
    attempts: 0,
    errorMessage: null,
    referenceWeek: "2026-04-13 até 2026-04-20",
  },
]

function statusFromLabel(label?: string) {
  if (label === "Enviado") return "SENT"
  if (label === "Falha") return "FAILED"
  if (label === "Pendente") return "PENDING"
  return undefined
}

function filterHistory(query: Record<string, string | undefined>) {
  const status = statusFromLabel(query.status)
  const clientId = query.clientId

  return historyRows.filter((row) => {
    const matchesStatus = !status || row.status === status
    const matchesClient = !clientId || row.clientId === clientId

    return matchesStatus && matchesClient
  })
}

function mockHistory() {
  cy.intercept("GET", "/api/clients", clientLookup).as("loadClients")
  cy.intercept("GET", "/api/history*", (req) => {
    req.reply(filterHistory(req.query as Record<string, string | undefined>))
  }).as("loadHistory")
  cy.intercept("POST", "/api/reports/report-failed/send", {
    ok: true,
    queued: false,
    reportId: "report-failed",
    jobId: null,
    status: "SENT",
  }).as("retryReport")
}

describe("Histórico de Relatórios", () => {
  beforeEach(() => {
    cy.viewport(1440, 1080)
    mockHistory()
    cy.login()
    cy.visit("/dashboard/history")
    cy.wait("@loadClients")
    cy.wait("@loadHistory")
  })

  it("deve carregar os cards e a tabela", () => {
    cy.contains("Histórico de Relatórios").should("be.visible")
    cy.contains("Enviados").should("be.visible")
    cy.contains("Falhas").should("be.visible")
    cy.contains("Pendentes").should("be.visible")
    cy.contains("Paula Manually Great").should("be.visible")
    cy.contains("Camila Lucarelli Great").should("be.visible")
    cy.contains("Status").should("be.visible")
    cy.contains("Tentativas").should("be.visible")
  })

  it("deve filtrar por status e por cliente", () => {
    cy.contains("button", /^Falha$/).click()
    cy.wait("@loadHistory")
    cy.contains("Camila Lucarelli Great").should("be.visible")
    cy.contains("Paula Manually Great").should("not.exist")

    cy.contains("button", /^Todos$/).click()
    cy.wait("@loadHistory")

    cy.get('input[placeholder="Buscar cliente..."]').type("Paula")
    cy.contains("Paula Manually Great").should("be.visible")
    cy.contains("Camila Lucarelli Great").should("not.exist")

    cy.get('input[placeholder="Buscar cliente..."]').clear()
    cy.contains("Paula Manually Great").should("be.visible")

    cy.get('button[aria-haspopup="listbox"]').first().click({ force: true })
    cy.contains('[role="option"]', "Camila Lucarelli Great").click()
    cy.wait("@loadHistory")
    cy.contains("Camila Lucarelli Great").should("be.visible")
    cy.contains("Paula Manually Great").should("not.exist")
  })

  it("deve reenviar um relatório com falha", () => {
    cy.contains("button", "Falha").click()
    cy.wait("@loadHistory")

    cy.contains("Reenviar").click()
    cy.wait("@retryReport")
    cy.wait("@loadHistory")

    cy.contains("Relatório reenviado com sucesso.").should("be.visible")
  })

  it("deve exportar CSV sem travar a página", () => {
    cy.window().then((win) => {
      cy.stub(win.URL, "createObjectURL").returns("blob:fake")
      cy.stub(win.URL, "revokeObjectURL").returns(undefined)
    })

    cy.contains("Exportar CSV").click()
    cy.contains("Exportar CSV").should("be.visible")
  })
})
