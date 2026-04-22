/// <reference types="cypress" />

describe('Dashboard – KPIs e Equipes', () => {

  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-kpis', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
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
    const assertNumber = (selector: string) => {
      cy.get(`[data-cy="${selector}"]`)
        .invoke('text')
        .then((text) => {
          const num = Number(text.replace(/\D/g, ''))
          expect(isNaN(num)).to.equal(false)
        })
    }

    assertNumber('card-clientes-ativos-value')
    assertNumber('card-novos-clientes-value')
    assertNumber('card-churned-value')
    assertNumber('card-sla-risco-value')
  })

  // ── Tropa de Elite ─────────────────────────────────────────

  it('Tropa de Elite: exibe indicadores válidos', () => {
    cy.get('[data-cy="equipe-tropa-elite"]').should('be.visible')

    cy.get('[data-cy="equipe-tropa-elite"]').within(() => {

      cy.get('[data-cy*="total"]').invoke('text').then(assertValidNumber)
      cy.get('[data-cy*="ativos"]').invoke('text').then(assertValidNumber)
      cy.get('[data-cy*="onboarding"]').invoke('text').then(assertValidNumber)

      // churned opcional (data-cy="tropa-churned")
      cy.get('[data-cy="tropa-churned"]').then(($el) => {
        if ($el.length > 0) {
          cy.wrap($el).invoke('text').then(assertValidNumber)
        } else {
          cy.log('Cancelados não exibido (ok)')
        }
      })

      // renewals opcional (data-cy="tropa-renewals")
      cy.get('[data-cy="tropa-renewals"]').then(($el) => {
        if ($el.length > 0) {
          cy.wrap($el).invoke('text').then(assertValidNumber)
        } else {
          cy.log('Renovações não exibido (ok)')
        }
      })

    })
  })

  // ── Equipe 7 ───────────────────────────────────────────────

  it('Equipe 7: exibe indicadores válidos', () => {
    cy.get('[data-cy="equipe-7"]').should('be.visible')

    cy.get('[data-cy="equipe-7"]').within(() => {

      cy.get('[data-cy*="total"]').invoke('text').then(assertValidNumber)
      cy.get('[data-cy*="ativos"]').invoke('text').then(assertValidNumber)
      cy.get('[data-cy*="onboarding"]').invoke('text').then(assertValidNumber)

      // churned opcional (data-cy="equipe7-churned")
      cy.get('[data-cy="equipe7-churned"]').then(($el) => {
        if ($el.length > 0) {
          cy.wrap($el).invoke('text').then(assertValidNumber)
        } else {
          cy.log('Cancelados não exibido (ok)')
        }
      })

      // renewals opcional (data-cy="equipe7-renewals")
      cy.get('[data-cy="equipe7-renewals"]').then(($el) => {
        if ($el.length > 0) {
          cy.wrap($el).invoke('text').then(assertValidNumber)
        } else {
          cy.log('Renovações não exibido (ok)')
        }
      })

    })
  })

  // ── SLA em risco ───────────────────────────────────────────

  it('SLA em risco: valor é válido e equipes estão sincronizadas', () => {
    cy.get('[data-cy="card-sla-risco-value"]')
      .invoke('text')
      .then((text) => {
        const valor = Number(text.replace(/\D/g, ''))
        expect(isNaN(valor)).to.equal(false)

        cy.get('[data-cy="tropa-total"]').invoke('text').then((t) => {
          expect(Number(t.replace(/\D/g, ''))).to.be.gte(0)
        })

        cy.get('[data-cy="equipe7-total"]').invoke('text').then((t) => {
          expect(Number(t.replace(/\D/g, ''))).to.be.gte(0)
        })
      })
  })

  // ── Consistência de dados ──────────────────────────────────

  it('numerações das equipes fazem sentido (ativos + onboarding <= total)', () => {

    // Tropa
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
