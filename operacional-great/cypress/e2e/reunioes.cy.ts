/// <reference types="cypress" />
export {}

const NOW = Date.now()
const FUTURE_START = new Date(NOW + 2 * 24 * 60 * 60 * 1000).toISOString()
const FUTURE_END = new Date(NOW + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()
const THIS_WEEK_START = new Date(NOW + 24 * 60 * 60 * 1000).toISOString()
const THIS_WEEK_END = new Date(NOW + 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString()
const PAST_START = new Date(NOW - 4 * 24 * 60 * 60 * 1000).toISOString()
const PAST_END = new Date(NOW - 4 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString()

const TEST_ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const TEST_MEETINGS = [
  {
    id: 'meeting-upcoming-1',
    title: 'Alinhamento Semanal',
    datetime_start: FUTURE_START,
    datetime_end: FUTURE_END,
    scope: 'GERAL',
    agenda: 'Definir prioridades da semana',
    recording_link: 'https://example.com/gravacao',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'meeting-upcoming-2',
    title: 'Daily de Atendimento',
    datetime_start: THIS_WEEK_START,
    datetime_end: THIS_WEEK_END,
    scope: 'EQUIPE',
    agenda: 'Pendencias do atendimento',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
  {
    id: 'meeting-past-1',
    title: 'Revisao de Resultados',
    datetime_start: PAST_START,
    datetime_end: PAST_END,
    scope: 'GERAL',
    agenda: 'Analise da ultima semana',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
]

function visitReunioes() {
  cy.visit('/operacional/reunioes', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_meetings', JSON.stringify(TEST_MEETINGS))
    },
  })
}

describe('Reunioes - area operacional', () => {
  beforeEach(() => {
    cy.viewport(1366, 900)
    visitReunioes()
    cy.contains(/Reuni/i, { timeout: 15000 }).should('be.visible')
  })

  it('mostra estatisticas, proximas reunioes, reunioes anteriores e link de gravacao', () => {
    cy.contains(/Pr.ximas/i).should('be.visible')
    cy.contains(/Nesta semana/i).should('be.visible')
    cy.contains(/Gerais/i).should('be.visible')

    cy.contains(/Pr.ximas reuni/i).should('be.visible')
    cy.contains('Alinhamento Semanal').should('be.visible')
    cy.contains('Daily de Atendimento').should('be.visible')
    cy.contains(/Ver grava/i).should('be.visible')

    cy.contains(/Reuni.es anteriores/i).should('be.visible')
    cy.contains('Revisao de Resultados').should('be.visible')
  })

  it('cria uma nova reuniao sem repeticao de fluxo', () => {
    cy.contains('button', /Nova reuni/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains(/Agendar reuni/i).should('be.visible')

    cy.get('[role="dialog"] input').eq(0).type('Reuniao com Cliente Premium')
    cy.get('[role="dialog"] input').eq(1).type('2099-06-20T10:00')
    cy.get('[role="dialog"] input').eq(2).type('2099-06-20T11:00')
    cy.get('[role="dialog"] textarea').type('Validar entregas, pauta e proximos passos.')
    cy.contains('button', /Criar reuni/i).click()

    cy.contains('Reuniao com Cliente Premium').should('be.visible')
  })

  it('edita e remove uma reuniao existente', () => {
    cy.contains('Alinhamento Semanal')
      .closest('div[class*="group"]')
      .find('button[title*="Editar"]')
      .click({ force: true })

    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"] input').eq(0).clear().type('Alinhamento Semanal Editado')
    cy.contains('button', /Salvar altera/i).click()
    cy.contains('Alinhamento Semanal Editado').should('be.visible')

    cy.contains('Alinhamento Semanal Editado')
      .closest('div[class*="group"]')
      .find('button[title*="Remover"]')
      .click({ force: true })

    cy.contains('button', /Remover/i).click()
    cy.contains('Alinhamento Semanal Editado').should('not.exist')
  })
})
