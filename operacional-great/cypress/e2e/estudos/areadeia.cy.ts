/// <reference types="cypress" />
export {}

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const SEED_CATEGORIES = [
  {
    id: 'cat-1',
    name: 'CRM e Clientes',
    description: 'Materiais para relacionamento com clientes.',
    created_at: new Date().toISOString(),
  },
  {
    id: 'cat-2',
    name: 'Execucao',
    description: 'Fluxos de rotina operacional.',
    created_at: new Date().toISOString(),
  },
]

const seedStudyAi = (win: Window) => {
  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_study_categories', JSON.stringify(SEED_CATEGORIES))
}

const visitGreatStudyAIArea = () => {
  cy.visit('/operacional/area-estudo/ia', {
    onBeforeLoad(win) {
      seedStudyAi(win)
    },
  })

  cy.contains('Great Study AI', { timeout: 15000 }).should('be.visible')
}

const visitGreatStudyChat = () => {
  cy.visit('/operacional/great-study-ai', {
    onBeforeLoad(win) {
      seedStudyAi(win)
    },
  })

  cy.contains('h1', 'Great Study AI', { timeout: 15000 }).should('be.visible')
}

describe('Great Study AI - Area de Estudos', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitGreatStudyAIArea()
  })

  it('exibe os modos geral e foco por area com textos corrigidos', () => {
    cy.contains('button', 'Modo geral').should('be.visible')
    cy.contains('button', /Foco por .rea/i).should('be.visible')
    cy.contains(/Sugest.es r.pidas/i).should('be.visible')
    cy.contains(/.rea de foco/i).should('be.visible')
  })

  it('permite clicar nos cards sugeridos e preencher o chat', () => {
    cy.contains(/Crie um quiz sobre este tema/i).click()
    cy.get('textarea').should('have.value', 'Crie um quiz sobre este tema')
  })

  it('permite perguntar algo no chat e receber resposta simulada', () => {
    cy.get('textarea').type('Como organizar a rotina operacional?')
    cy.contains('button', 'Enviar').click()

    cy.contains('Como organizar a rotina operacional?').should('be.visible')
    cy.contains('Resposta simulada').should('be.visible')
    cy.contains('modo geral').should('be.visible')
  })

  it('permite usar foco por area e responder com o contexto da area', () => {
    cy.contains('button', /Foco por .rea/i).click()
    cy.get('button[role="combobox"]').click()
    cy.get('[role="option"]').contains('CRM e Clientes').click()

    cy.get('textarea').type('Quais pontos devo revisar?')
    cy.contains('button', 'Enviar').click()

    cy.contains('Resposta simulada').should('be.visible')
    cy.contains(/foco na .rea/i).should('be.visible')
    cy.contains('CRM e Clientes').should('be.visible')
  })
})

describe('Great Study AI - Conversas', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitGreatStudyChat()
  })

  it('permite criar uma nova conversa', () => {
    cy.contains('button', /Nova conversa/i).click()
    cy.contains(/Comece uma conversa para estudar processos operacionais com a IA/i).should('not.exist')
    cy.contains(/Nova conversa/i).should('exist')
  })

  it('permite clicar nos cards disponiveis e gerar conversa com resposta', () => {
    cy.contains(/Monte um checklist/i).click()
    cy.contains(/Monte um checklist/i).should('be.visible')
    cy.contains('Resposta simulada').should('be.visible')
  })

  it('permite perguntar algo manualmente no chat', () => {
    cy.get('textarea').type('Preciso de ajuda com onboarding{enter}')

    cy.contains('Preciso de ajuda com onboarding').should('be.visible')
    cy.contains('Resposta simulada').should('be.visible')
  })

  it('permite voltar para a area de estudos', () => {
    cy.contains(/Voltar para conte.dos/i).click()
    cy.url().should('include', '/operacional/area-estudo/conteudos')
    cy.contains(/Conte.dos/i).should('be.visible')
  })
})
