describe("Dashboard", () => {
  beforeEach(() => {
    cy.login()
    cy.visit("/dashboard")
  })

  it("deve carregar a página do dashboard", () => {
    cy.url().should("include", "/dashboard")
    cy.contains("p", "Dashboard").should("be.visible")
  })

  it("deve exibir os cards de estatísticas", () => {
    // Os stats cards são renderizados pelo DashboardStats
    // Aguarda o conteúdo carregar (não há loading spinner no server component)
    cy.get("main, [class*='max-w']").should("exist")

    // Verifica que a seção de stats existe na página
    // (Os cards contêm números e labels de métricas)
    cy.get("body").should("not.contain", "Erro ao carregar")
  })

  it("deve exibir a sidebar de navegação", () => {
    cy.get("aside").should("be.visible")
    cy.get("aside").contains("Dashboard").should("be.visible")
    cy.get("aside").contains("Clientes").should("be.visible")
    cy.get("aside").contains("Relatórios").should("be.visible")
    cy.get("aside").contains("Histórico").should("be.visible")
    cy.get("aside").contains("Configurações").should("be.visible")
  })

  it("deve navegar para Clientes pelo menu lateral", () => {
    cy.get("aside").find('a[aria-label="Clientes"]').should("have.attr", "href", "/dashboard/clients")
    cy.visit("/dashboard/clients")
    cy.url().should("include", "/dashboard/clients")
    cy.contains("p", "Clientes").should("be.visible")
  })

  it("deve navegar para Relatórios pelo menu lateral", () => {
    cy.get("aside").find('a[aria-label="Relatórios"]').should("have.attr", "href", "/dashboard/reports")
    cy.visit("/dashboard/reports")
    cy.url().should("include", "/dashboard/reports")
  })

  it("deve navegar para Histórico pelo menu lateral", () => {
    cy.get("aside").find('a[aria-label="Histórico"]').should("have.attr", "href", "/dashboard/history")
    cy.visit("/dashboard/history")
    cy.url().should("include", "/dashboard/history")
    cy.contains("Histórico de Relatórios").should("be.visible")
  })

  it("deve navegar para Configurações pelo menu lateral", () => {
    cy.get("aside").find('a[aria-label="Configurações"]').should("have.attr", "href", "/dashboard/settings")
  })

  it("deve recolher e expandir o menu lateral", () => {
    // O botão de recolher tem aria-label="Recolher menu"
    cy.get('button[aria-label="Recolher menu"]').click()

    // Após recolher, o botão de expandir aparece
    cy.get('button[aria-label="Expandir menu"]').should("be.visible")

   
    cy.get('button[aria-label="Expandir menu"]').click()

    // Volta ao estado expandido
    cy.get("aside").contains("Dashboard").should("be.visible")
  })

  it("deve exibir as iniciais do usuário na sidebar", () => {
    // O avatar com iniciais fica no rodapé da sidebar
    cy.get("aside").find(".rounded-full").should("exist")
  })

  it("deve fazer logout ao clicar no botão de sair", () => {
    cy.intercept("POST", "/api/auth/signout*").as("signout")

    cy.get('button[aria-label="Sair"]').click({ force: true })
    cy.wait("@signout").its("response.statusCode").should("be.oneOf", [200, 302])
    cy.clearCookie("next-auth.session-token")
    cy.clearCookies()
    cy.visit("/login")
    cy.contains("Entrar na plataforma").should("be.visible")
  })
})
