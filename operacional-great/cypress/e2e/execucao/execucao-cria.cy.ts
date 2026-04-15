/// <reference types="cypress" />
export {}

// ── Setup ─────────────────────────────────────────────────────────────────────
const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const SEED_CLIENTS = [
  {
    id: 'client-1',
    client_name: 'Clínica Bella Vita',
    clinic_name: 'Bella Vita Estética',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: 'equipe-7',
    pacote: 'COMPLETO',
    created_at: new Date().toISOString(),
  },
  {
    id: 'client-2',
    client_name: 'Odontoclínica Sorriso',
    clinic_name: 'Sorriso Pleno',
    status_operacional: 'ONBOARDING',
    onboarding_stage: 'ONBOARDING',
    team_id: 'equipe-7',
    pacote: 'COMPLETO_NOVA_ERA',
    created_at: new Date().toISOString(),
  },
]

const SEED_CREATIVES_PARA_SUBIR = [
  {
    id: 'creative-1',
    client_id: 'client-1',
    client_name: 'Clínica Bella Vita',
    image_url: '',
    image_urls: [],
    status: 'PARA_SUBIR',
    created_by_user_id: 'test-admin-1',
    created_by_name: 'Admin Teste',
    completed_by_user_id: null,
    completed_by_name: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const SEED_CREATIVES_ATIVOS = [
  {
    id: 'creative-2',
    client_id: 'client-2',
    client_name: 'Odontoclínica Sorriso',
    image_url: '',
    image_urls: [],
    status: 'ATIVO',
    created_by_user_id: 'test-admin-1',
    created_by_name: 'Admin Teste',
    completed_by_user_id: 'test-admin-1',
    completed_by_name: 'Admin Teste',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
describe('Execução — Criativos / Anúncios', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/operacional/execucao/criativos', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(SEED_CLIENTS))
        win.localStorage.setItem(
          'mock_db_ad_creatives',
          JSON.stringify([...SEED_CREATIVES_PARA_SUBIR, ...SEED_CREATIVES_ATIVOS])
        )
      },
    })
    cy.contains('Criativos', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura da página ────────────────────────────────────────────────────

  it('exibe o título "Criativos — Anúncios"', () => {
    cy.contains('Criativos — Anúncios').should('be.visible')
  })

  it('exibe o botão para adicionar criativo', () => {
    cy.get('button').contains(/adicionar criativo|novo anúncio/i).should('be.visible')
  })

  it('exibe a seção "Anúncios para Subir"', () => {
    cy.contains('Anúncios para Subir').should('be.visible')
  })

  it('exibe a seção "Anúncios Ativos"', () => {
    cy.contains('Anúncios Ativos').should('be.visible')
  })

  // ── Listagem de criativos ──────────────────────────────────────────────────

  it('exibe o criativo PARA_SUBIR na seção correta', () => {
    cy.contains('Anúncios para Subir')
      .parents('[class*="flex"]').first()
      .within(() => {
        cy.contains('Clínica Bella Vita').should('be.visible')
      })
  })

  it('exibe o criativo ATIVO na seção de Ativos', () => {
    cy.contains('Anúncios Ativos')
      .parents('[class*="flex"]').first()
      .within(() => {
        cy.contains('Odontoclínica Sorriso').should('be.visible')
      })
  })

  // ── Dialog de adicionar criativo ───────────────────────────────────────────

  it('abrir o dialog de criativo exibe o título correto', () => {
    cy.get('button').contains(/adicionar criativo|novo anúncio/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Novo Anúncio para Subir').should('be.visible')
  })

  it('o dialog de criativo exibe campo de cliente', () => {
    cy.get('button').contains(/adicionar criativo|novo anúncio/i).click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains(/Cliente|Clínica/i).should('be.visible')
    })
  })

  it('fechar o dialog de criativo funciona corretamente', () => {
    cy.get('button').contains(/adicionar criativo|novo anúncio/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })
})
