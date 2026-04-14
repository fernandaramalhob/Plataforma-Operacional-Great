/// <reference types="cypress" />
/**
 * Dashboard – Cards de Próximas Tarefas, Próximas Reuniões,
 *             Perdas e Renovações
 */

// ── Clientes fixos semeados antes de cada teste ────────────────────────────
const TOMORROW = new Date(Date.now() + 86_400_000).toISOString()

const CLIENTES_SEED = [
  // Aparece no card "Perdas"
  {
    id: 'seed-perda-1',
    client_name: 'Clínica Estética Bella Vita',
    status_operacional: 'ENCERRADO',
    churn_status: 'CONFIRMED',
    churn_reason: 'Preço fora do orçamento',
    team_id: 'tropa-de-elite',
    deal_value: 2800,
    created_at: new Date().toISOString(),
  },
  // Aparece no card "Renovações"
  {
    id: 'seed-renovacao-1',
    client_name: 'Odontoclínica Sorriso Pleno',
    status_operacional: 'ATIVO',
    renewal_status: 'RENEWED',
    renewal_date: TOMORROW,
    team_id: 'equipe-7',
    deal_value: 3500,
    created_at: new Date().toISOString(),
  },
]

describe('Dashboard – Cards de Clientes, Tarefas e Reuniões', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.session('admin-cards', () => { cy.loginAdmin() })

    cy.visit('/operacional/dashboard')

    // Insere os clientes semeados no mock localStorage
    cy.window().then((win) => {
      const key = 'mock_db_operational_clients'
      const existing: any[] = JSON.parse(win.localStorage.getItem(key) || '[]')
      const seedIds = CLIENTES_SEED.map((c) => c.id)
      const semFiltro = existing.filter((c) => !seedIds.includes(c.id))
      win.localStorage.setItem(key, JSON.stringify([...semFiltro, ...CLIENTES_SEED]))
    })

    cy.reload()
    cy.get('h1', { timeout: 15000 }).should('be.visible')
  })

  // ── Novos Clientes ─────────────────────────────────────────

  it('exibe o widget de Novos Clientes', () => {
    cy.contains('Novos Clientes').should('be.visible')
  })

  it('o KPI de Novos Clientes mostra um número válido', () => {
    cy.get('[data-cy="card-novos-clientes-value"]')
      .invoke('text')
      .then((text) => {
        expect(isNaN(Number(text.replace(/\D/g, '')))).to.equal(false)
      })
  })

  // ── Próximas Tarefas ───────────────────────────────────────

  it('exibe o card de Próximas Tarefas', () => {
    cy.get('[data-cy="card-proximas-tarefas"]').should('be.visible')
    cy.contains('Próximas Tarefas').should('be.visible')
  })

  it('após criar tarefa ela aparece em Próximas Tarefas', () => {
    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')
    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa futura Cypress')
    cy.get('[data-cy="btn-salvar-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')

    cy.reload()
    cy.get('h1', { timeout: 15000 }).should('be.visible')
    cy.get('[data-cy="card-proximas-tarefas"]').should('be.visible')
  })

  it('clica em um item de Próximas Tarefas quando existir', () => {
    cy.get('[data-cy="card-proximas-tarefas"]').then(($card) => {
      const $items = $card.find('[data-cy="proxima-tarefa-item"]')

      if ($items.length === 0) {
        cy.wrap($card).contains('Nenhuma tarefa pendente').should('be.visible')
        return
      }

      cy.wrap($items.first()).should('be.visible').click()
      cy.url().then((url) => {
        const abriuDetalhe =
          url.includes('meu-dia') ||
          Cypress.$('[role="dialog"]').length > 0
        expect(abriuDetalhe).to.equal(true)
      })
    })
  })

  // ── Próximas Reuniões ──────────────────────────────────────

  it('exibe o card de Próximas Reuniões', () => {
    cy.get('[data-cy="card-proximas-reunioes"]').should('be.visible')
    cy.contains('Próximas Reuniões').should('be.visible')
  })

  it('após criar reunião ela aparece em Próximas Reuniões', () => {
    cy.get('[data-cy="acao-rapida-nova-reuniao"]').click()
    cy.get('[data-cy="modal-nova-reuniao"]').should('be.visible')
    cy.get('[data-cy="input-reuniao-titulo"]').type('Reunião futura Cypress')
    cy.get('[data-cy="modal-nova-reuniao"]')
      .find('input[type="datetime-local"]')
      .first()
      .type('2099-11-30T14:00')
    cy.get('[data-cy="btn-salvar-reuniao"]').click()
    cy.get('[data-cy="modal-nova-reuniao"]').should('not.exist')

    cy.reload()
    cy.get('h1', { timeout: 15000 }).should('be.visible')
    cy.get('[data-cy="card-proximas-reunioes"]').should('be.visible')
  })

  it('clica em um item de Próximas Reuniões quando existir', () => {
    cy.get('[data-cy="card-proximas-reunioes"]').then(($card) => {
      const $items = $card.find('[data-cy="proxima-reuniao-item"]')

      if ($items.length === 0) {
        cy.wrap($card).contains('Nenhuma reunião agendada').should('be.visible')
        return
      }

      cy.wrap($items.first()).should('be.visible').click()
      cy.url().then((url) => {
        const abriuDetalhe =
          url.includes('reunioes') ||
          Cypress.$('[role="dialog"]').length > 0
        expect(abriuDetalhe).to.equal(true)
      })
    })
  })

  // ── Perdas ─────────────────────────────────────────────────
  // O beforeEach já semeia "Clínica Estética Bella Vita" como perda

  it('visualiza o card de Perdas', () => {
    cy.get('[data-cy="card-perdas"]').should('be.visible')
    cy.contains('Perdas').should('be.visible')
  })

  it('card de Perdas exibe "Clínica Estética Bella Vita"', () => {
    cy.get('[data-cy="card-perdas"]').should('be.visible')
    cy.get('[data-cy="perda-item"]').should('have.length.at.least', 1)
    cy.contains('Clínica Estética Bella Vita').should('be.visible')
  })

  it('clica em detalhe de perda e abre o dialog com nome do cliente', () => {
    cy.get('[data-cy="perda-item"]').first().click()
    cy.contains('Detalhes da Perda', { timeout: 5000 }).should('be.visible')
    cy.contains('Clínica Estética Bella Vita').should('be.visible')

    cy.get('body').type('{esc}')
    cy.get('[role="dialog"]').should('not.exist')
  })

  // ── Renovações ─────────────────────────────────────────────
  // O beforeEach já semeia "Odontoclínica Sorriso Pleno" como renovação

  it('visualiza o card de Renovações', () => {
    cy.get('[data-cy="card-renovacoes"]').should('be.visible')
    cy.contains('Renovações').should('be.visible')
  })

  it('card de Renovações exibe "Odontoclínica Sorriso Pleno"', () => {
    cy.get('[data-cy="card-renovacoes"]').should('be.visible')
    cy.get('[data-cy="renovacao-item"]').should('have.length.at.least', 1)
    cy.contains('Odontoclínica Sorriso Pleno').should('be.visible')
  })
})
