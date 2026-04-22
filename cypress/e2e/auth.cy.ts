describe("Autenticação", () => {
  beforeEach(() => {
    cy.viewport(1440, 1080)
  })

  it("deve criar sessão de teste e liberar o dashboard", () => {
    cy.login()

    cy.request("/api/auth/session")
      .its("body.user")
      .should((user) => {
        expect(user).to.have.property("email", "admin@greatgo.com")
        expect(user).to.have.property("role")
      })

    cy.visit("/dashboard")
    cy.contains("Dashboard").should("be.visible")
    cy.get('button[aria-label="Sair"]').should("be.visible")
  })
})
