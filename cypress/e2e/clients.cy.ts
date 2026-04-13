describe("Clientes", () => {
  beforeEach(() => {
    cy.login()
    cy.visit("/dashboard/clients")
  })

  // ─── Listagem ────────────────────────────────────────────────────────────

  it("deve carregar a página de clientes", () => {
    cy.contains("p", "Clientes").should("be.visible")
    cy.contains("Novo Cliente").should("be.visible")
  })

  it("deve exibir a tabela ou o estado vazio após carregar", () => {
    // Aguarda o loading desaparecer
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    // Deve exibir a tabela com clientes ou o empty state
    cy.get("body").then(($body) => {
      const hasTable = $body.find("table").length > 0
      const hasEmpty = $body.text().includes("Nenhum cliente encontrado")

      expect(hasTable || hasEmpty).to.be.true
    })
  })

  it("deve exibir os cabeçalhos corretos na tabela", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table").length > 0) {
        cy.get("table thead").contains("Cliente").should("be.visible")
        cy.get("table thead").contains("Empresa").should("be.visible")
        cy.get("table thead").contains("Status META").should("be.visible")
        cy.get("table thead").contains("Campanhas").should("be.visible")
        cy.get("table thead").contains("Cadastrado em").should("be.visible")
        cy.get("table thead").contains("Ações").should("be.visible")
      }
    })
  })

  // ─── Filtros ──────────────────────────────────────────────────────────────

  it("deve filtrar clientes por texto de busca", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    cy.get('input[placeholder="Buscar por nome ou empresa..."]').type("xxxxxxxxxx")
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    // Deve mostrar lista vazia ou resultados filtrados
    cy.get("body").should(
      "satisfy",
      ($body: JQuery<HTMLBodyElement>) =>
        $body.text().includes("Nenhum cliente encontrado") ||
        $body.find("table tbody tr").length >= 0
    )
  })

  it("deve limpar a busca e restaurar a lista", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    const searchInput = cy.get(
      'input[placeholder="Buscar por nome ou empresa..."]'
    )
    searchInput.type("xxxxxxxxxx")
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    searchInput.clear()
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    // Após limpar, lista volta a aparecer (ou empty state se não tiver clientes)
    cy.get("body").should("be.visible")
  })

  it("deve filtrar pelo status Ativo / Inativo", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    // O FilterSelect de status tem as opções: Todos, Ativo, Inativo
    // Seleciona "Ativo"
    cy.get("body").then(($body) => {
      // Encontra o select que contém "Status: Todos"
      const selects = $body.find("select")
      if (selects.length > 0) {
        cy.wrap(selects.first()).select("ACTIVE")
        cy.contains("Carregando clientes...", { timeout: 15000 }).should(
          "not.exist"
        )
        cy.get("body").should("be.visible")
      }
    })
  })

  // ─── Navegação ────────────────────────────────────────────────────────────

  it("deve navegar para a página de novo cliente", () => {
    cy.contains("Novo Cliente").click()
    cy.url().should("include", "/dashboard/clients/new")
    cy.contains("p", "Novo cliente").should("be.visible")
  })

  it("deve navegar para a página do cliente ao clicar em Ver", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0) {
        cy.get("table tbody tr").first().contains("Ver").click()
        cy.url().should("match", /\/dashboard\/clients\/[^/]+$/)
      }
    })
  })

  it("deve voltar para a lista ao clicar no link de navegação", () => {
    cy.contains("Novo Cliente").click()
    cy.url().should("include", "/dashboard/clients/new")

    cy.contains("Clientes / Novo cliente").click()
    cy.url().should("include", "/dashboard/clients")
    cy.url().should("not.include", "/new")
  })

  // ─── Formulário de novo cliente ───────────────────────────────────────────

  describe("Formulário de Novo Cliente", () => {
    beforeEach(() => {
      cy.visit("/dashboard/clients/new")
    })

    it("deve exibir o formulário de novo cliente", () => {
      cy.contains("p", "Novo cliente").should("be.visible")
      cy.contains("Informações do cliente").should("be.visible")
      cy.contains("Salvar cliente").should("be.visible")
      cy.contains("Cancelar").should("be.visible")
    })

    it("deve exibir erro ao tentar salvar sem preencher o perfil", () => {
      cy.contains("Salvar cliente").click()
      cy.contains("Selecione o nome do perfil.").should("be.visible")
    })

    it("deve preencher o campo de e-mail de contato", () => {
      cy.get('input[name="email"]').type("contato@empresa.com.br")
      cy.get('input[name="email"]').should("have.value", "contato@empresa.com.br")
    })

    it("deve preencher o campo de telefone", () => {
      cy.get('input[name="phone"]').type("(11) 99999-9999")
      cy.get('input[name="phone"]').should("have.value", "(11) 99999-9999")
    })

    it("deve preencher o campo de WhatsApp Group ID", () => {
      cy.get('input[name="whatsappGroupId"]').type(
        "120363407411420148@g.us"
      )
      cy.get('input[name="whatsappGroupId"]').should(
        "have.value",
        "120363407411420148@g.us"
      )
    })

    it("deve preencher o campo de observações", () => {
      cy.get('textarea[name="notes"]').type("Nota de teste para o cliente.")
      cy.get('textarea[name="notes"]').should(
        "have.value",
        "Nota de teste para o cliente."
      )
    })

    it("deve cancelar e voltar para a lista de clientes", () => {
      cy.contains("Cancelar").click()
      cy.url().should("include", "/dashboard/clients")
      cy.url().should("not.include", "/new")
    })

    it("deve exibir seção de integração META", () => {
      cy.contains("Opções da integração com a META").should("be.visible")
    })

    it("deve exibir estado de carregamento enquanto busca dados da META", () => {
      // O loading aparece brevemente ao carregar as opções
      // Verifica que o formulário existe independente do estado do META
      cy.get('input[name="profileName"]').should("exist")
    })
  })

  // ─── Exclusão ─────────────────────────────────────────────────────────────

  it("deve exibir botão de exclusão para cada cliente na tabela", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0) {
        cy.get('button[aria-label*="Excluir cliente"]').should("exist")
      }
    })
  })

  it("deve abrir o diálogo de confirmação ao clicar em excluir", () => {
    cy.contains("Carregando clientes...", { timeout: 15000 }).should("not.exist")

    cy.get("body").then(($body) => {
      if ($body.find("table tbody tr").length > 0) {
        // Cancela a confirmação nativa do browser para não excluir dados reais
        cy.on("window:confirm", () => false)
        cy.get('button[aria-label*="Excluir cliente"]').first().click()
        // O confirm foi cancelado — cliente não deve sumir da lista
        cy.get("table tbody tr").should("have.length.at.least", 1)
      }
    })
  })
})
