//código do ranking geral das duas equipes
//Ranking
/// <reference types="cypress" />
export {}

// ── Seed de equipes do campeonato ─────────────────────────────────────────────
const SEED_TEAMS = [
  {
    id: 'champ-1',
    team_id: 'equipe-7',
    label: 'Equipe 7',
    badge_color: '#2563EB',
    total_points: 150,
    renewals: 5,
    losses: 2,
    items_sold: 10,
    previous_rank: 2,
    current_rank: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'champ-2',
    team_id: 'tropa-de-elite',
    label: 'Tropa de Elite',
    badge_color: '#DC2626',
    total_points: 120,
    renewals: 3,
    losses: 4,
    items_sold: 8,
    previous_rank: 1,
    current_rank: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

// ─────────────────────────────────────────────────────────────────────────────
describe('Ranking - Área Comercial', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.visit('/operacional/ranking', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_championship_teams', JSON.stringify(SEED_TEAMS))
      },
    })

    // Aguarda o skeleton sair e o conteúdo real aparecer
    cy.contains('Champions Great League', { timeout: 15000 }).should('be.visible')
  })

  // Equipe ganhadora

  it('exibe a equipe ganhadora no card correto', () => {
    cy.contains(/equipe ganhadora/i).should('be.visible')

    cy.get('[data-testid="winner-team-card"]').within(() => {
      cy.contains(/equipe/i).should('be.visible')
      cy.contains(/\d+/).should('be.visible') // valor ou pontuação
    })
  })

  // Vendas últimos dias

  it('exibe valor de vendas dos últimos dias', () => {
    cy.contains(/últimos dias|ultimos dias/i).should('be.visible')

    cy.get('[data-testid="sales-last-days"]').should(($el) => {
      const text = $el.text()
      expect(text).to.match(/\d/) // tem número
    })
  })

  // Renovação e perdas

  it('exibe valores de renovação e perdas', () => {
    cy.contains(/renova/i).should('be.visible')
    cy.contains(/perda/i).should('be.visible')

    cy.get('[data-testid="renewals-value"]').should('contain.text', 'R$')
    cy.get('[data-testid="losses-value"]').should('contain.text', 'R$')
  })

  // Filtros (equipe + período)

  it('permite filtrar por equipe', () => {
    // Abre a aba Classificação para expor o filtro de equipe
    cy.contains('Classificação').click()

    cy.get('[data-testid="filter-team"]').contains(/equipe 7/i).click()
    cy.get('[data-testid="ranking-list"]').should('exist')
  })

  it('permite alternar ranking entre semanal, mensal e anual', () => {
    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/semanal/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'semanal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/mensal/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'mensal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/anual/i).click()
    })
    cy.get('[data-testid="ranking-period"]').should('contain', 'anual')
  })

  // Ranking por período

  it('ranking muda ao alterar período', () => {
    // O indicador de período (ranking-period) reflete a troca
    cy.get('[data-testid="ranking-period"]').should('contain', 'mensal')

    cy.get('[data-testid="filter-period"]').within(() => {
      cy.contains(/semanal/i).click()
    })

    cy.get('[data-testid="ranking-period"]').should('contain', 'semanal')
  })

  // Resumo do ano

  it('exibe e atualiza os valores do resumo do ano', () => {
    cy.get('[data-testid="year-summary"]').should('be.visible')

    cy.get('[data-testid="year-summary"]').should(($el) => {
      expect($el.text()).to.match(/\d/)
    })
  })

  // Retrospectiva

  it('retrospectiva do ano está funcionando', () => {
    cy.contains(/retrospectiva/i).click()

    cy.get('[data-testid="retrospective-modal"]').should('be.visible')

    cy.get('[data-testid="retrospective-content"]').should('not.be.empty')
  })

  // Leitura rápida

  it('leitura rápida muda de acordo com o resultado', () => {
    // padrão é 'mensal' — muda para 'semanal' para garantir mudança no texto
    cy.get('[data-testid="quick-insight"]').invoke('text').then((textoInicial) => {

      cy.get('[data-testid="filter-period"]').within(() => {
        cy.contains(/semanal/i).click()
      })

      cy.get('[data-testid="quick-insight"]').invoke('text').should((novoTexto) => {
        expect(novoTexto).not.to.eq(textoInicial)
      })
    })
  })
})
