/// <reference types="cypress" />
export {}

type StudyCategorySeed = {
  id: string
  name: string
  color: string
  icon?: string
  description?: string | null
  created_at: string
}

type StudyResourceSeed = {
  id: string
  category_id: string
  title: string
  description: string | null
  source_url: string | null
  file_ref: string | null
  type: 'LINK' | 'DOCUMENT'
  tags: string[]
  difficulty: string
  visibility: string
  created_by_user_id: string
  created_at: string
  updated_at: string
}

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const SEED_CATEGORIES: StudyCategorySeed[] = [
  {
    id: 'cat-1',
    name: 'CRM e Clientes',
    color: '#e10600',
    icon: 'users',
    description: 'Materiais de relacionamento e acompanhamento.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Execução',
    color: '#f59e0b',
    icon: 'target',
    description: 'Rotina operacional do dia a dia.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-3',
    name: 'Rituais',
    color: '#10b981',
    icon: 'book',
    description: 'Reuniões, cadências e processos.',
    created_at: new Date().toISOString(),
  },
]

const SEED_RESOURCES: StudyResourceSeed[] = [
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
    created_by_user_id: TEST_ADMIN.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'res-2',
    category_id: 'cat-2',
    title: 'Manual de Execução de Tarefas',
    description: 'Checklist para garantir a operação em dia.',
    source_url: 'https://example.com/manual',
    file_ref: null,
    type: 'LINK',
    tags: [],
    difficulty: 'INTERMEDIARIO',
    visibility: 'ALL_INTERNAL',
    created_by_user_id: TEST_ADMIN.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const visitStudyArea = () => {
  cy.visit('/operacional/area-estudo/conteudos', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_study_categories', JSON.stringify(SEED_CATEGORIES))
      win.localStorage.setItem('mock_db_study_resources', JSON.stringify(SEED_RESOURCES))
    },
  })

  cy.contains(/Conte.dos/i, { timeout: 15000 }).should('be.visible')
}

describe('Área de Estudos', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitStudyArea()
  })

  it('carrega a tela com textos corrigidos e CTA da IA', () => {
    cy.contains(/Conte.dos/i).should('be.visible')
    cy.contains(/Biblioteca interna com materiais/i).should('be.visible')
    cy.contains(/Todos os conte.dos/i).should('be.visible')
    cy.contains('Great Study AI').should('be.visible')
    cy.get('input[placeholder*="Buscar por"]').should('be.visible')
  })

  it('filtra conteúdos por título e por área', () => {
    cy.get('input[placeholder*="Buscar por"]').type('Onboarding')
    cy.contains('Guia de Onboarding de Clientes').should('be.visible')
    cy.contains('Manual de Execução de Tarefas').should('not.exist')

    cy.get('input[placeholder*="Buscar por"]').clear()
    cy.contains('Execução').click()
    cy.contains('Manual de Execução de Tarefas').should('be.visible')
    cy.contains('Guia de Onboarding de Clientes').should('not.exist')
    cy.contains(/.rea ativa/i).parent().should('contain.text', 'Execução')
  })

  it('permite adicionar uma nova área', () => {
    const area = `Nova Área ${Date.now()}`

    cy.contains('button', /Nova .rea/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('input[placeholder*="Nome da"]').type(area)
    cy.get('textarea[placeholder*="Descri"]').type('Área criada pelo teste')
    cy.contains('button', /Criar .rea/i).click()

    cy.contains(area, { timeout: 10000 }).should('be.visible')
  })

  it('permite adicionar conteúdo e exibi-lo na listagem', () => {
    const titulo = `Conteúdo ${Date.now()}`

    cy.contains('button', /Adicionar conte.do/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').within(() => {
      cy.get('button[role="combobox"]').first().click()
    })
    cy.get('[role="option"]').contains('CRM e Clientes').click()
    cy.get('[role="dialog"] input').eq(0).type(titulo)
    cy.get('[role="dialog"] textarea').type('Conteúdo novo salvo no mock')
    cy.get('[role="dialog"] input').eq(1).type('https://example.com/conteudo')
    cy.contains('button', /Salvar conte.do/i).click()

    cy.contains(titulo, { timeout: 10000 }).should('be.visible')
    cy.contains('Conteúdo novo salvo no mock').should('be.visible')
    cy.contains(/Abrir link/i).should('be.visible')
  })

  it('abre a página Great Study AI ao clicar no botão da IA', () => {
    cy.contains('button', 'Great Study AI').click()
    cy.url().should('include', '/operacional/great-study-ai')
    cy.contains('Great Study AI').should('be.visible')
  })
})
