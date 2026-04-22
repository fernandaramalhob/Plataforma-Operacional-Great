/// <reference types="cypress" />
export {}

describe('Inteligência – Ranking entre equipes', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('admin-inteligencia', () => {
      cy.loginAdmin()
    }, { cacheAcrossSpecs: false })

    cy.visit('/operacional/inteligencia')
  })

  // ── Estrutura da página ──────────────────────────────────────

  it('exibe o título "Ranking entre equipes"', () => {
    cy.contains('Ranking entre equipes', { timeout: 15000 }).should('be.visible')
  })

  it('exibe o subtítulo descritivo', () => {
    cy.contains(/liderando em vendas/i, { timeout: 15000 }).should('be.visible')
  })

  // ── Filtros ──────────────────────────────────────────────────

  it('exibe o filtro de equipes', () => {
    cy.contains('button[role="combobox"]', /todas as equipes/i, { timeout: 15000 }).should('be.visible')
  })

  it('exibe o filtro de período', () => {
    cy.get('button[role="combobox"]', { timeout: 15000 }).should('have.length.gte', 2)
  })

  it('filtro de equipe oferece opções de Equipe 7 e Tropa de Elite', () => {
    cy.contains('button[role="combobox"]', /todas as equipes/i).click()
    cy.contains('[role="option"]', 'Equipe 7').should('be.visible')
    cy.contains('[role="option"]', 'Tropa de Elite').should('be.visible')
    cy.get('body').type('{esc}')
  })

  it('filtro de período oferece opções Semanal, Mensal e Anual', () => {
    cy.get('button[role="combobox"]').last().click()
    cy.contains('[role="option"]', 'Semanal').should('be.visible')
    cy.contains('[role="option"]', 'Mensal').should('be.visible')
    cy.contains('[role="option"]', 'Anual').should('be.visible')
    cy.get('body').type('{esc}')
  })

  it('trocar período para Mensal atualiza o label no select', () => {
    cy.get('button[role="combobox"]').last().click()
    cy.contains('[role="option"]', 'Mensal').click()
    cy.contains('button[role="combobox"]', /mensal/i).should('be.visible')
  })

  it('trocar período para Anual atualiza o label no select', () => {
    cy.get('button[role="combobox"]').last().click()
    cy.contains('[role="option"]', 'Anual').click()
    cy.contains('button[role="combobox"]', /anual/i).should('be.visible')
  })

  // ── Cards de resumo ──────────────────────────────────────────

  it('exibe card de equipe ganhadora', () => {
    cy.contains(/equipe ganhadora/i, { timeout: 15000 }).should('be.visible')
  })

  it('exibe indicadores de renovações e perdas no período', () => {
    cy.contains(/renova/i, { timeout: 15000 }).should('be.visible')
    cy.contains(/perda/i).should('be.visible')
  })
})
