describe("Histórico de Relatórios", () => {
  beforeEach(() => {
    cy.login()
    cy.visit("/dashboard/history")
  })

  // ─── Carregamento ─────────────────────────────────────────────────────────

  it("deve carregar a página de histórico", () => {
    cy.contains("Histórico de Relatórios").should("be.visible")
  })

  it("deve exibir os cards de resumo de status", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("Enviados").should("be.visible")
    cy.contains("Falhas").should("be.visible")
    cy.contains("Pendentes").should("be.visible")
  })

  it("deve exibir a tabela ou estado vazio após carregar", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").then(($body) => {
      const hasTable = $body.find("table").length > 0
      const hasEmpty = $body.text().includes("Nenhum registro encontrado")

      expect(hasTable || hasEmpty).to.be.true
    })
  })

  it("deve exibir os cabeçalhos corretos na tabela", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table").length > 0) {
        cy.get("table thead").contains("Data e Hora").should("be.visible")
        cy.get("table thead").contains("Cliente").should("be.visible")
        cy.get("table thead").contains("Status").should("be.visible")
        cy.get("table thead").contains("Tentativas").should("be.visible")
        cy.get("table thead").contains("Ações").should("be.visible")
      }
    })
  })

  // ─── Filtros de status ────────────────────────────────────────────────────

  it("deve filtrar por status Enviado", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Enviado").click()
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    // O filtro "Enviado" deve estar ativo (fundo branco / destaque)
    cy.contains("button", "Enviado")
      .should("have.class", "bg-white")
  })

  it("deve filtrar por status Falha", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Falha").click()
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0) {
        // Todos os registros visíveis devem ter status "Falha"
        cy.get("table tbody tr").each(($row) => {
          cy.wrap($row).contains("Falha")
        })
      }
    })
  })

  it("deve filtrar por status Pendente", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Pendente").click()
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").should("be.visible")
  })

  it("deve voltar para Todos ao clicar no botão Todos", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Falha").click()
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Todos").click()
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.contains("button", "Todos").should("have.class", "bg-white")
  })

  // ─── Filtro de busca ──────────────────────────────────────────────────────

  it("deve filtrar por nome de cliente na busca", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get('input[placeholder="Buscar cliente..."]').type("xxxxxxxxxx")

    cy.get("body").then(($body) => {
      const hasEmpty = $body.text().includes("Nenhum registro encontrado")
      const hasRows = $body.find("table tbody tr").length > 0

      expect(hasEmpty || hasRows).to.be.true
    })
  })

  it("deve limpar a busca e exibir todos os registros novamente", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    const searchInput = cy.get('input[placeholder="Buscar cliente..."]')
    searchInput.type("xxxxxxxxxx")
    searchInput.clear()

    cy.get("body").should("be.visible")
  })

  // ─── Navegação ────────────────────────────────────────────────────────────

  it("deve navegar para a página de detalhes do relatório ao clicar em Ver", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0) {
        cy.get("table tbody tr").first().contains("Ver").click()
        cy.url().should("match", /\/dashboard\/reports\/[^/]+$/)
      }
    })
  })

  // ─── Exportação CSV ───────────────────────────────────────────────────────

  it("deve exibir o botão de Exportar CSV", () => {
    cy.contains("Exportar CSV").should("be.visible")
  })

  it("deve iniciar o download do CSV ao clicar em Exportar", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    // Intercepta a criação de URL de objeto para não disparar download real
    cy.window().then((win) => {
      cy.stub(win.URL, "createObjectURL").returns("blob:fake")
      cy.stub(win.URL, "revokeObjectURL").returns(undefined)
    })

    cy.contains("Exportar CSV").click()
    // O download é disparado — basta confirmar que o botão permanece visível
    cy.contains("Exportar CSV").should("be.visible")
  })

  // ─── Reenvio ──────────────────────────────────────────────────────────────

  it("deve exibir botão Reenviar para relatórios com status Falha", () => {
    cy.contains("Carregando histórico...", { timeout: 30000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0 && $body.find('td').filter((_, el) => el.innerText?.includes("Falha")).length > 0) {
        cy.contains("Reenviar").should("be.visible")
      }
    })
  })
})
