import { seedDashboard } from './mocks/dashboard'

Cypress.Commands.add('visitDashboard', () => {
  cy.session('user', () => cy.loginUser())

  cy.visit('/operacional/dashboard', {
    onBeforeLoad: (win) => seedDashboard(win),
  })

  cy.contains('Operação Great', { timeout: 15000 }).should('be.visible')
})

Cypress.Commands.add('loginUser', () => {
  cy.visit('/login')
  cy.get('[data-cy="input-email"]', { timeout: 10000 }).type('user@teste.com')
  cy.get('[data-cy="input-senha"]').type('123456')
  cy.get('[data-cy="btn-login"]').click()
  // ATENDENTE → redireciona para /operacional/dashboard
  cy.url({ timeout: 10000 }).should('not.include', '/login')
})

Cypress.Commands.add('loginAdmin', () => {
  cy.visit('/login')
  cy.get('[data-cy="input-email"]', { timeout: 10000 }).type('admin@teste.com')
  cy.get('[data-cy="input-senha"]').type('123456')
  cy.get('[data-cy="btn-login"]').click()
  // ADMIN → redireciona para /select-module (pois não tem módulo selecionado)
  cy.url({ timeout: 10000 }).should('not.include', '/login')
})
// Types are declared in cypress/support/index.d.ts and cypress/support/cypress.d.ts