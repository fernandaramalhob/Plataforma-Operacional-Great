import { seedDashboard } from './mocks/dashboard'

// ── Objetos de usuário (espelham o que AuthContext salva em great_user) ───────

const TEST_USER = {
  id: 'test-user-1',
  name: 'Usuário Teste',
  email: 'user@teste.com',
  role: 'ATENDENTE',
  teamId: 'team-1',
  active: true,
  createdAt: new Date().toISOString(),
}

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

/**
 * loginUser / loginAdmin — estratégia de injeção direta
 *
 * Por que não usar o formulário de login:
 *  - cy.session pode restaurar great_users sem os usuários de teste
 *  - O React do formulário tem race condition com o redirect do Login.tsx
 *
 * Solução:
 *  1. onBeforeLoad seta great_user + great_selected_module ANTES do React rodar
 *  2. Visitamos a página de destino final (não /login)
 *  3. ProtectedRoute lê isAuthenticated=true e deixa passar
 *  4. Sem depender de redirect nenhum do Login.tsx
 */

Cypress.Commands.add('loginUser', () => {
  cy.visit('/operacional/dashboard', {
    onBeforeLoad: (win) => {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_USER))
      // ATENDENTE → módulo OPERACIONAL automaticamente (sem precisar de /select-module)
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
    },
  })
  cy.url({ timeout: 15000 }).should('not.include', '/login')
})

Cypress.Commands.add('loginAdmin', () => {
  cy.visit('/operacional/dashboard', {
    onBeforeLoad: (win) => {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      // Admin precisa de módulo selecionado para não cair em /select-module
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
    },
  })
  cy.url({ timeout: 15000 }).should('not.include', '/login')
})

Cypress.Commands.add('visitDashboard', () => {
  cy.session('visitDashboard-user', () => cy.loginUser(), { cacheAcrossSpecs: false })

  cy.visit('/operacional/dashboard', {
    onBeforeLoad: (win) => seedDashboard(win),
  })

  cy.contains('Operação Great', { timeout: 15000 }).should('be.visible')
})

// Types are declared in cypress/support/index.d.ts and cypress/support/cypress.d.ts
