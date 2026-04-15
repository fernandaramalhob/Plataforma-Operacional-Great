/// <reference types="cypress" />
export {}

// ── Seed de dados de execução ──────────────────────────────────────────────
// O mock já semeia exec_boards e exec_columns automaticamente via seedDefaultData.
// Aqui garantimos o estado inicial de auth e os boards/cards via localStorage.

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const SEED_BOARDS = [
  { id: 'board-geral-1', name: 'Quadro Principal', sector: 'GERAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-trafego-1', name: 'Quadro Tráfego', sector: 'TRAFEGO', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-atendimento-1', name: 'Quadro Atendimento', sector: 'ATENDIMENTO', is_default: true, team_id: null, created_at: new Date().toISOString() },
  { id: 'board-marketing-1', name: 'Quadro Marketing', sector: 'MARKETING_DIGITAL', is_default: true, team_id: null, created_at: new Date().toISOString() },
]

const SEED_COLUMNS = [
  { id: 'col-1', name: 'A Fazer', board_id: 'board-geral-1', position: 0, order: 0, color: '#6366f1', created_at: new Date().toISOString() },
  { id: 'col-2', name: 'Em Andamento', board_id: 'board-geral-1', position: 1, order: 1, color: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'col-3', name: 'Concluído', board_id: 'board-geral-1', position: 2, order: 2, color: '#10b981', created_at: new Date().toISOString() },
]

const SEED_CARDS = [
  {
    id: 'card-1',
    board_id: 'board-geral-1',
    column_id: 'col-1',
    title: 'Criar relatório de métricas',
    description: 'Relatório semanal de performance',
    priority: 'MEDIA',
    due_date: null,
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: null,
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'card-2',
    board_id: 'board-geral-1',
    column_id: 'col-2',
    title: 'Revisar criativos da semana',
    description: null,
    priority: 'ALTA',
    due_date: null,
    tags: [],
    checklist: [],
    attachments: [],
    watchers: [],
    pinned: false,
    cover_image: null,
    client_id: null,
    assigned_to_user_id: null,
    created_by_user_id: 'test-admin-1',
    completed_at: null,
    order: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
describe('Execução — Quadro Kanban', () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    cy.visit('/operacional/execucao', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
        win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
        win.localStorage.setItem('mock_db_exec_boards', JSON.stringify(SEED_BOARDS))
        win.localStorage.setItem('mock_db_exec_columns', JSON.stringify(SEED_COLUMNS))
        win.localStorage.setItem('mock_db_exec_cards', JSON.stringify(SEED_CARDS))
      },
    })
    // Aguarda o quadro carregar
    cy.contains('Quadro Principal', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura geral ────────────────────────────────────────────────────────

  it('exibe o nome do quadro selecionado', () => {
    cy.contains('Quadro Principal').should('be.visible')
  })

  it('exibe a sidebar com os setores disponíveis', () => {
    cy.contains('Geral').should('be.visible')
    cy.contains('Tráfego Pago').should('be.visible')
    cy.contains('Atendimento').should('be.visible')
    cy.contains('Marketing Digital').should('be.visible')
  })

  it('exibe os botões de alternância de visualização (Quadro e Lista)', () => {
    cy.contains('button', 'Quadro').should('be.visible')
    cy.contains('button', 'Lista').should('be.visible')
  })

  it('exibe o botão "Novo card"', () => {
    cy.contains('button', 'Novo card').should('be.visible')
  })

  it('exibe o campo de pesquisa de cards', () => {
    cy.get('input[placeholder*="Pesquisar"]').should('be.visible')
  })

  // ── Kanban ─────────────────────────────────────────────────────────────────

  it('exibe as colunas do quadro (A Fazer, Em Andamento, Concluído)', () => {
    cy.contains('A Fazer').should('be.visible')
    cy.contains('Em Andamento').should('be.visible')
    cy.contains('Concluído').should('be.visible')
  })

  it('exibe os cards seedados no board', () => {
    cy.contains('Criar relatório de métricas').should('be.visible')
    cy.contains('Revisar criativos da semana').should('be.visible')
  })

  // ── Pesquisa ───────────────────────────────────────────────────────────────

  it('pesquisa por título filtra os cards visíveis', () => {
    cy.get('input[placeholder*="Pesquisar"]').type('relatório')
    cy.contains('Criar relatório de métricas').should('be.visible')
    cy.contains('Revisar criativos da semana').should('not.exist')
  })

  it('limpar a pesquisa restaura todos os cards', () => {
    cy.get('input[placeholder*="Pesquisar"]').type('relatório')
    cy.contains('Revisar criativos da semana').should('not.exist')
    cy.get('input[placeholder*="Pesquisar"]').clear()
    cy.contains('Revisar criativos da semana').should('be.visible')
  })

  // ── Alternância de visualização ────────────────────────────────────────────

  it('alternar para visualização em lista exibe tabela com colunas', () => {
    cy.contains('button', 'Lista').click()
    cy.get('table').should('be.visible')
    cy.get('th').contains('Título').should('be.visible')
    cy.get('th').contains('Coluna').should('be.visible')
    cy.get('th').contains('Prioridade').should('be.visible')
  })

  it('alternar de volta para quadro restaura o Kanban', () => {
    cy.contains('button', 'Lista').click()
    cy.contains('button', 'Quadro').click()
    cy.contains('A Fazer').should('be.visible')
  })

  // ── Novo card ──────────────────────────────────────────────────────────────

  it('clicar em "Novo card" abre o modal de criação', () => {
    cy.contains('button', 'Novo card').click()
    cy.get('[role="dialog"]').should('be.visible')
  })

  // ── Trocar setor ───────────────────────────────────────────────────────────

  it('selecionar setor "Tráfego Pago" na sidebar muda o quadro ativo', () => {
    cy.contains('Tráfego Pago').click()
    cy.contains('Quadro Tráfego', { timeout: 8000 }).should('be.visible')
  })
})
