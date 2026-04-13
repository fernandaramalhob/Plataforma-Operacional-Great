/// <reference types="cypress" />

export {}

declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
    }
  }
}

/**
 * Faz login via UI e armazena a sessão em cache para evitar re-login a cada teste.
 * As credenciais podem ser sobrescritas via cypress.env.json:
 *   { "email": "admin@greatgo.com", "password": "suasenha" }
 */
Cypress.Commands.add("login", (email?: string, password?: string) => {
  const userEmail = email ?? Cypress.env("email") ?? "admin@greatgo.com"
  const userPassword = password ?? Cypress.env("password") ?? "admin123"

  cy.session(
    [userEmail, userPassword],
    () => {
      cy.visit("/login")
      cy.get('input[type="email"]').type(userEmail)
      cy.get('input[type="password"]').type(userPassword)
      cy.get('button[type="submit"]').click()
      cy.url().should("include", "/dashboard")
    },
    {
      cacheAcrossSpecs: true,
    }
  )
})
