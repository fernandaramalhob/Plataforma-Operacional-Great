/// <reference types="cypress" />

/**
 * Faz login de teste sem depender de request HTTP no bootstrap.
 * O token é gerado no Node do Cypress e o cookie é gravado direto no browser.
 */
Cypress.Commands.add("login", (email?: string, password?: string) => {
  const userEmail = email ?? Cypress.env("email") ?? "admin@greatgo.com"
  const userPassword = password ?? Cypress.env("password") ?? "admin123"

  cy.task("buildNextAuthSession", {
    email: userEmail,
    password: userPassword,
  })
    .then((result) => {
      const token = (result as { token?: string } | undefined)?.token ?? ""

      expect(token).to.be.a("string")
      expect(token).to.not.equal("")

      cy.setCookie("next-auth.session-token", token, {
        path: "/",
        httpOnly: true,
        secure: false,
        sameSite: "lax",
      })
    })

  cy.getCookie("next-auth.session-token").then((cookie) => {
    expect(cookie).to.be.an("object")
  })
})
