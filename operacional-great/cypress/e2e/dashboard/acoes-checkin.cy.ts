/// <reference types="cypress" />
/**
 * Dashboard – Ações Rápidas, Criar Tarefa e Check-in
 *
 * Cobre:
 *  - Criar tarefa (ação rápida e botão do header)
 *  - Fazer check-in
 *  - Criar reunião (ação rápida)
 */

describe('Dashboard – Ações Rápidas e Check-in', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-acoes', () => { cy.loginAdmin() })
    cy.visit('/operacional/dashboard')
    cy.get('h1', { timeout: 15000 }).should('be.visible')
    // Limpa o estado de check-in do localStorage para o teste ser idempotente
    cy.window().then((win) => {
      win.localStorage.removeItem('great_last_checkin')
      win.localStorage.removeItem('great_checkin_time')
    })
    cy.reload()
    cy.contains('Operação Great', { timeout: 15000 }).should('be.visible')
  })

  // ── Criar tarefa via ação rápida ───────────────────────────

  it('cria uma nova tarefa pelas Ações Rápidas', () => {
    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa via ação rápida')
    cy.get('[data-cy="input-tarefa-descricao"]').type('Descrição automática do Cypress')
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    // Modal fecha = tarefa criada com sucesso
    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  // ── Criar tarefa via botão do header ──────────────────────

  it('cria uma nova tarefa pelo botão "Criar tarefa" do header', () => {
    cy.contains('Criar tarefa').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa header Cypress')
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')
  })

  // ── Criar reunião via ação rápida ──────────────────────────

  it('cria uma nova reunião pelas Ações Rápidas', () => {
    cy.get('[data-cy="acao-rapida-nova-reuniao"]').click()

    cy.get('[data-cy="modal-nova-reuniao"]').should('be.visible')
    cy.get('[data-cy="input-reuniao-titulo"]').type('Reunião via ação rápida')

    // Preenche data/hora de início (campo obrigatório)
    cy.get('[data-cy="modal-nova-reuniao"]')
      .find('input[type="datetime-local"]')
      .first()
      .type('2099-12-31T10:00')

    cy.get('[data-cy="btn-salvar-reuniao"]').click()
    cy.get('[data-cy="modal-nova-reuniao"]').should('not.exist')
  })

  // ── Check-in ───────────────────────────────────────────────

  it('faz check-in e o botão "Fazer check-out" aparece', () => {
    cy.get('body').then(($body) => {
      const jaFezCheckIn = $body.text().includes('Fazer check-out')

      if (jaFezCheckIn) {
        // Já fez check-in hoje — verifica que o estado está correto
        cy.contains('Fazer check-out').should('be.visible')
      } else {
        // Clica no botão de fazer check-in
        cy.contains('Fazer check-in').click()

        // O dialog de confirmação abre
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('[role="dialog"]').contains('Confirmar Check-in').should('be.visible')

        // Confirma o check-in (botão dentro do dialog footer)
        cy.get('[role="dialog"]').find('button').contains('Confirmar Check-in').click()

        // Dialog fecha e botão "Fazer check-out" aparece — indicador do estado
        cy.get('[role="dialog"]').should('not.exist')
        cy.contains('Fazer check-out', { timeout: 8000 }).should('be.visible')
      }
    })
  })
})
