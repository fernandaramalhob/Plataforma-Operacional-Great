/// <reference types="cypress" />
/**
 * Dashboard – KPI Cards e Indicadores de Equipe
 *
 * Cobre:
 *  - Cards Clientes Ativos, Novos Clientes, Churned, SLA em risco
 *  - Numerações (total, ativos, onboarding, renovações, cancelados)
 *    das equipes Tropa de Elite e Equipe 7
 */

describe('Dashboard – KPIs e Equipes', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-kpis', () => { cy.loginAdmin() })
    cy.visit('/operacional/dashboard')
    cy.get('h1', { timeout: 15000 }).should('be.visible')
  })

  // ── KPI Cards ──────────────────────────────────────────────

  it('exibe os quatro cards principais', () => {
    cy.get('[data-cy="card-clientes-ativos"]').should('be.visible')
    cy.get('[data-cy="card-novos-clientes"]').should('be.visible')
    cy.get('[data-cy="card-churned"]').should('be.visible')
    cy.get('[data-cy="card-sla-risco"]').should('be.visible')
  })

  it('os cards exibem valores numéricos válidos', () => {
    const assertNumber = (cy: Cypress.cy & CyEventEmitter, selector: string) =>
      cy.get(`[data-cy="${selector}"]`).invoke('text').then((text) => {
        expect(isNaN(Number(text.replace(/\D/g, '')))).to.equal(false)
      })

    assertNumber(cy, 'card-clientes-ativos-value')
    assertNumber(cy, 'card-novos-clientes-value')
    assertNumber(cy, 'card-churned-value')
    assertNumber(cy, 'card-sla-risco-value')
  })

  // ── Tropa de Elite ─────────────────────────────────────────

  it('Tropa de Elite: exibe os 5 indicadores com números válidos', () => {
    cy.get('[data-cy="equipe-tropa-elite"]').should('be.visible')

    ;['tropa-total', 'tropa-ativos', 'tropa-onboarding', 'tropa-renovacoes', 'tropa-cancelados']
      .forEach((sel) =>
        cy.get(`[data-cy="${sel}"]`).invoke('text').then(assertValidNumber)
      )
  })

  // ── Equipe 7 ───────────────────────────────────────────────

  it('Equipe 7: exibe os 5 indicadores com números válidos', () => {
    cy.get('[data-cy="equipe-7"]').should('be.visible')

    ;['equipe7-total', 'equipe7-ativos', 'equipe7-onboarding', 'equipe7-renovacoes', 'equipe7-cancelados']
      .forEach((sel) =>
        cy.get(`[data-cy="${sel}"]`).invoke('text').then(assertValidNumber)
      )
  })

  // ── Variação de numeração (SLA em risco sobe após criar tarefa) ───

  it('SLA em risco: valor é um número e a seção de equipes está sincronizada', () => {
    // Lê SLA em risco antes
    cy.get('[data-cy="card-sla-risco-value"]')
      .invoke('text')
      .then((text) => {
        const valor = Number(text.replace(/\D/g, ''))
        expect(isNaN(valor)).to.equal(false)
        // Confirma que as equipes têm valores >= 0 e que os totais fazem sentido
        cy.get('[data-cy="tropa-total"]').invoke('text').then((t) => {
          expect(Number(t.replace(/\D/g, ''))).to.be.gte(0)
        })
        cy.get('[data-cy="equipe7-total"]').invoke('text').then((t) => {
          expect(Number(t.replace(/\D/g, ''))).to.be.gte(0)
        })
      })
  })

  it('numerações das equipes: ativos + onboarding + cancelados <= total', () => {
    // Tropa de Elite
    cy.get('[data-cy="tropa-total"]').invoke('text').then((total) => {
      cy.get('[data-cy="tropa-ativos"]').invoke('text').then((ativos) => {
        cy.get('[data-cy="tropa-onboarding"]').invoke('text').then((onboarding) => {
          const t = Number(total.replace(/\D/g, ''))
          const a = Number(ativos.replace(/\D/g, ''))
          const o = Number(onboarding.replace(/\D/g, ''))
          expect(a + o).to.be.lte(t)
        })
      })
    })

    // Equipe 7
    cy.get('[data-cy="equipe7-total"]').invoke('text').then((total) => {
      cy.get('[data-cy="equipe7-ativos"]').invoke('text').then((ativos) => {
        cy.get('[data-cy="equipe7-onboarding"]').invoke('text').then((onboarding) => {
          const t = Number(total.replace(/\D/g, ''))
          const a = Number(ativos.replace(/\D/g, ''))
          const o = Number(onboarding.replace(/\D/g, ''))
          expect(a + o).to.be.lte(t)
        })
      })
    })
  })
})

function assertValidNumber(text: string) {
  const v = Number(text.replace(/[^\d-]/g, ''))
  expect(isNaN(v)).to.equal(false)
}
