/// <reference types="cypress" />
export {}

// ── Seed de categorias e recursos ─────────────────────────────────────────────
const SEED_CATEGORIES = [
  { id: 'cat-1', name: 'CRM e Clientes', color: '#e10600', created_at: new Date().toISOString() },
  { id: 'cat-2', name: 'Execução', color: '#f59e0b', created_at: new Date().toISOString() },
  { id: 'cat-3', name: 'Rituais', color: '#10b981', created_at: new Date().toISOString() },
]

const SEED_RESOURCES = [
  {
    id: 'res-1',
    category_id: 'cat-1',
    title: 'Guia de Onboarding de Clientes',
    description: 'Passo a passo do processo de onboarding operacional.',
    source_url: 'https://example.com/guia',
    file_ref: null,
    type: 'LINK',
    tags: [],
    difficulty: 'INICIANTE',
    visibility: 'ALL_INTERNAL',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-2',
    category_id: 'cat-2',
    title: 'Manual de Execucao de Tarefas',
    description: null,
    source_url: null,
    file_ref: null,
    type: 'LINK',
    tags: [],
    difficulty: 'INTERMEDIARIO',
    visibility: 'ALL_INTERNAL',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

// ─────────────────────────────────────────────────────────────────────────────
describe('Area de Estudos', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    // Usa o mesmo padrão dos testes de dashboard que funcionam
    cy.session('admin-estudos', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
    cy.visit('/operacional/area-estudo', {
      onBeforeLoad(win) {
        // Auth já foi configurado pelo cy.session (great_user + great_selected_module)
        // Aqui apenas injetamos os dados de estudo antes do React carregar
        win.localStorage.setItem('mock_db_study_categories', JSON.stringify(SEED_CATEGORIES))
        win.localStorage.setItem('mock_db_study_resources', JSON.stringify(SEED_RESOURCES))
      },
    })
    cy.contains('rea de Estudos', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura da página ────────────────────────────────────────────────────

  it('exibe o titulo da pagina e subtitulo', () => {
    cy.contains('rea de Estudos').should('be.visible')
    cy.contains('setor operacional').should('be.visible')
  })

  it('exibe o sidebar com o titulo de areas', () => {
    cy.contains('reas de estudo').should('be.visible')
  })

  it('exibe o botao "Todos os conteudos" no sidebar', () => {
    cy.contains('button', 'Todos os conte').should('be.visible')
  })

  it('exibe o campo de busca', () => {
    cy.get('input[placeholder*="Buscar por t"]').should('be.visible')
  })

  it('exibe o link para Great Study AI', () => {
    cy.contains('Great Study AI').should('be.visible')
  })

  it('exibe o botao de adicionar conteudo para admin', () => {
    cy.contains('button', 'Adicionar conte').should('be.visible')
  })

  // ── Categorias na sidebar ──────────────────────────────────────────────────

  it('exibe as categorias na sidebar', () => {
    cy.contains('CRM e Clientes').should('be.visible')
    cy.contains('Rituais').should('be.visible')
  })

  it('clicar em uma categoria filtra os recursos', () => {
    cy.contains('CRM e Clientes').click()
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Manual de Execucao de Tarefas').should('not.exist')
  })

  it('clicar em Todos os conteudos restaura todos os recursos', () => {
    cy.contains('CRM e Clientes').click()
    cy.contains('Manual de Execucao de Tarefas').should('not.exist')
    cy.contains('button', 'Todos os conte').click()
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Manual de Execucao de Tarefas').should('be.visible')
  })

  // ── Listagem de conteúdos ──────────────────────────────────────────────────

  it('exibe os recursos seedados como cards', () => {
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Manual de Execucao de Tarefas').should('be.visible')
  })

  it('recurso com source_url exibe o botao Acessar link', () => {
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Acessar link').should('be.visible')
  })

  it('exibe a descricao do recurso quando preenchida', () => {
    cy.contains('Passo a passo do processo de onboarding operacional.').should('be.visible')
  })

  // ── Busca ──────────────────────────────────────────────────────────────────

  it('busca por titulo filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar por t"]').type('Onboarding')
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Manual de Execucao de Tarefas').should('not.exist')
  })

  it('busca sem resultado exibe mensagem de nenhum conteudo encontrado', () => {
    cy.get('input[placeholder*="Buscar por t"]').type('xyzABC_inexistente')
    cy.contains('Nenhum conte').should('be.visible')
  })

  it('limpar a busca restaura todos os conteudos', () => {
    cy.get('input[placeholder*="Buscar por t"]').type('xyzABC_inexistente')
    cy.contains('Nenhum conte').should('be.visible')
    cy.get('input[placeholder*="Buscar por t"]').clear()
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
  })

  // ── Dialog de adicionar conteudo ───────────────────────────────────────────

  it('abrir o dialog de adicionar conteudo exibe os campos corretos', () => {
    cy.contains('button', 'Adicionar conte').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').within(() => {
      cy.contains('rea').should('be.visible')
      cy.contains('ulo').should('be.visible')
      cy.contains('crição').should('be.visible')
      cy.contains('Link').should('be.visible')
    })
  })

  it('dialog de adicionar conteudo pode ser fechado com Escape', () => {
    cy.contains('button', 'Adicionar conte').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('body').type('{esc}')
    cy.get('[role="dialog"]').should('not.exist')
  })

  // ── Navegação para Great Study AI ──────────────────────────────────────────

  it('clicar em Great Study AI navega para a pagina de IA', () => {
    cy.contains('Great Study AI').click()
    cy.url({ timeout: 8000 }).should('include', '/operacional/great-study-ai')
  })
})
