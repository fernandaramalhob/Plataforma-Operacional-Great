/// <reference types="cypress" />
export {}

// ── Seed de desafios ──────────────────────────────────────────────────────────
const SEED_CHALLENGES = [
  {
    id: 'challenge-1',
    title: 'Meta de 100 artes na semana',
    description: 'Produzir 100 criativos de alta qualidade nesta semana.',
    difficulty: 'MEDIA',
    bonus: 'R$ 200 de bônus',
    is_active: true,
    sector: 'operacional',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'challenge-2',
    title: 'Zero perdas no mês',
    description: 'Manter zero cancelamentos durante 30 dias.',
    difficulty: 'DIFICIL',
    bonus: 'Dia de folga',
    is_active: true,
    sector: 'operacional',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'challenge-3',
    title: 'Desafio inativo',
    description: 'Este desafio está desativado.',
    difficulty: 'FACIL',
    bonus: '',
    is_active: false,
    sector: 'operacional',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
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
describe('Mural dos Desafios', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/operacional/desafios', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_challenges', JSON.stringify(SEED_CHALLENGES))
      },
    })
    cy.contains('Mural dos Desafios', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura da página ────────────────────────────────────────────────────

  it('exibe o título "Mural dos Desafios"', () => {
    cy.contains('Mural dos Desafios').should('be.visible')
  })

  it('exibe o subtítulo descritivo', () => {
    cy.contains('Desafios disponíveis para a equipe').should('be.visible')
  })

  it('exibe o botão "Novo Desafio" para admin', () => {
    cy.contains('button', 'Novo Desafio').should('be.visible')
  })

  // ── Listagem de desafios ───────────────────────────────────────────────────

  it('exibe os desafios ativos do seed', () => {
    cy.contains('Meta de 100 artes na semana').should('be.visible')
    cy.contains('Zero perdas no mês').should('be.visible')
  })

  it('exibe os badges de dificuldade', () => {
    cy.contains('Médio').should('be.visible')
    cy.contains('Difícil').should('be.visible')
  })

  it('exibe o bônus do desafio quando preenchido', () => {
    cy.contains('R$ 200 de bônus').should('be.visible')
    cy.contains('Dia de folga').should('be.visible')
  })

  // ── Dialog de novo desafio ─────────────────────────────────────────────────

  it('abre o dialog ao clicar em "Novo Desafio"', () => {
    cy.contains('button', 'Novo Desafio').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Criar Novo Desafio').should('be.visible')
  })

  it('dialog exibe campos de título, descrição, dificuldade e bônus', () => {
    cy.contains('button', 'Novo Desafio').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Título do Desafio').should('be.visible')
      cy.contains('Descrição').should('be.visible')
      cy.contains('Dificuldade').should('be.visible')
    })
  })

  it('dialog pode ser fechado com Escape', () => {
    cy.contains('button', 'Novo Desafio').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('body').type('{esc}')
    cy.get('[role="dialog"]').should('not.exist')
  })

  it('select de dificuldade oferece as opções corretas', () => {
    cy.contains('button', 'Novo Desafio').click()
    cy.get('[role="dialog"]').within(() => {
      cy.get('button[role="combobox"]').click()
    })
    cy.contains('[role="option"]', 'Fácil').should('be.visible')
    cy.contains('[role="option"]', 'Médio').should('be.visible')
    cy.contains('[role="option"]', 'Difícil').should('be.visible')
    cy.contains('[role="option"]', 'Extremo').should('be.visible')
  })
})
