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

const TEST_CLIENTS = [
  {
    id: 'client-1',
    client_name: 'Clinica Bella Vita',
    clinic_name: 'Bella Vita Estetica',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: 'equipe-7',
    pacote: 'COMPLETO',
    created_at: new Date().toISOString(),
  },
  {
    id: 'client-2',
    client_name: 'Odonto Sorriso',
    clinic_name: 'Sorriso Pleno',
    status_operacional: 'ONBOARDING',
    onboarding_stage: 'ONBOARDING',
    team_id: 'equipe-7',
    pacote: 'COMPLETO_NOVA_ERA',
    created_at: new Date().toISOString(),
  },
]

const TEST_PROFILES = [
  { id: 'test-admin-1', full_name: 'Admin Teste', is_active: true, created_at: new Date().toISOString() },
  { id: 'profile-gestor', full_name: 'Gestor Growth', is_active: true, created_at: new Date().toISOString() },
]

const TEST_CREATIVES = [
  {
    id: 'creative-1',
    client_id: 'client-1',
    client_name: 'Clinica Bella Vita',
    image_url: 'mock-storage://ad-creatives/bella-vita-1.png',
    image_urls: ['mock-storage://ad-creatives/bella-vita-1.png'],
    status: 'PARA_SUBIR',
    created_by_user_id: 'test-admin-1',
    created_by_name: 'Designer A',
    completed_by_user_id: null,
    completed_by_name: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'creative-2',
    client_id: 'client-2',
    client_name: 'Odonto Sorriso',
    image_url: 'mock-storage://ad-creatives/sorriso-1.png',
    image_urls: ['mock-storage://ad-creatives/sorriso-1.png'],
    status: 'ATIVO',
    created_by_user_id: 'test-admin-1',
    created_by_name: 'Designer B',
    completed_by_user_id: 'profile-gestor',
    completed_by_name: 'Gestor Growth',
    completed_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

const TEST_ACTIVITY_TRACKING = [
  {
    id: 'tracking-1',
    client_id: 'client-1',
    year: 2026,
    month: 4,
    week: 3,
    artes_count: 2,
    designer_name: 'Designer A',
    created_by_user_id: 'test-admin-1',
    created_at: new Date().toISOString(),
  },
]

function seedStorage(win: Window) {
  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(TEST_CLIENTS))
  win.localStorage.setItem('mock_db_profiles', JSON.stringify(TEST_PROFILES))
  win.localStorage.setItem('mock_db_ad_creatives', JSON.stringify(TEST_CREATIVES))
  win.localStorage.setItem('mock_db_client_activity_tracking', JSON.stringify(TEST_ACTIVITY_TRACKING))
}

function visitCriativos() {
  cy.visit('/operacional/execucao/criativos', {
    onBeforeLoad(win) {
      seedStorage(win)
    },
  })
}

function visitCliente() {
  cy.visit('/operacional/crm/cliente/client-1', {
    onBeforeLoad(win) {
      seedStorage(win)
    },
  })
}

describe('Execucao - criativos', () => {
  beforeEach(() => {
    cy.viewport(1400, 900)
  })

  it('valida quadro, novo anuncio e aba de atividades com rankings de quem mais criou e ativou', () => {
    visitCriativos()

    cy.contains(/Criativos/i, { timeout: 15000 }).should('be.visible')
    cy.contains(/An.ncios para Subir/i).should('be.visible')
    cy.contains(/An.ncios Ativos/i).should('be.visible')
    cy.contains('Clinica Bella Vita').should('be.visible')
    cy.contains('Odonto Sorriso').should('be.visible')

    cy.contains('button', /Novo An.ncio/i).click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains(/Novo An.ncio para Subir/i).should('be.visible')

    cy.contains('button', /Selecione o cliente/i).click()
    cy.contains('[role="option"]', 'Clinica Bella Vita').click()

    cy.contains(/Respons.vel pela Arte/i).parent().parent().within(() => {
      cy.contains('button', /Selecione o designer/i).click()
    })
    cy.contains('[role="option"]', 'Taiwan').click()

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('novo criativo de teste'),
        fileName: 'novo-criativo.txt',
        mimeType: 'text/plain',
      },
      { force: true },
    )

    cy.contains('button', 'Adicionar').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.contains('Clinica Bella Vita').should('be.visible')

    cy.contains('button', /Atividades/i).click()
    cy.contains(/Registro de Atividades/i).should('be.visible')
    cy.contains(/Criativos Criados/i).should('be.visible')
    cy.contains(/An.ncios Ativos/i).should('be.visible')
    cy.contains(/Quem mais criou/i).should('be.visible')
    cy.contains('Designer A').should('be.visible')
    cy.contains(/Quem mais ativou/i).should('be.visible')
    cy.contains('Gestor Growth').should('be.visible')
  })

  it('sincroniza arquivo enviado no cliente com a aba de criativos e atualiza ao subir', () => {
    visitCliente()

    cy.contains('Clinica Bella Vita', { timeout: 15000 }).should('be.visible')
    cy.contains(/Arquivos/i).should('be.visible')
    cy.contains('button', /Enviar Arquivo/i).click()

    cy.get('input[type="file"]').first().selectFile(
      {
        contents: Cypress.Buffer.from('arquivo do cliente para criativo'),
        fileName: 'cliente-bella-vita.txt',
        mimeType: 'text/plain',
      },
      { force: true },
    )

    cy.contains(/Arquivo\(s\) enviado\(s\)|Arquivo\(s\) enviado/i, { timeout: 15000 }).should('exist')
    cy.contains(/Criativos/i).should('be.visible')
    cy.contains(/An.ncios para Subir/i).should('be.visible')
    cy.contains('Clinica Bella Vita').should('be.visible')
    cy.contains('button', /Subir/i).click()
    cy.contains(/Ativado por/i).should('contain.text', 'Admin Teste')

    cy.visit('/operacional/execucao/criativos')
    cy.contains(/Criativos/i, { timeout: 15000 }).should('be.visible')
    cy.contains(/An.ncios Ativos/i).should('be.visible')
    cy.contains('Clinica Bella Vita').should('be.visible')
    cy.contains(/Ativado por/i).should('contain.text', 'Admin Teste')
  })
})
