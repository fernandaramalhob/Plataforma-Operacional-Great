/// <reference types="cypress" />
export {}

const SEED_CLIENTS = [
  {
    id: 'crm-ativo-1',
    client_name: 'Clinica Bella Vita',
    clinic_name: 'Bella Vita Estetica',
    status_operacional: 'ATIVO',
    onboarding_stage: 'ATIVO',
    team_id: 'equipe-7',
    pacote: 'COMPLETO',
    client_tier: 'PREMIUM',
    deal_value: 2000,
    created_at: '2024-01-15T10:00:00.000Z',
    activated_at: '2024-01-20T10:00:00.000Z',
  },
  {
    id: 'crm-ativacao-1',
    client_name: 'Odontoclinica Sorriso',
    clinic_name: 'Sorriso Pleno',
    status_operacional: 'ONBOARDING',
    onboarding_stage: 'ONBOARDING',
    team_id: 'equipe-7',
    pacote: 'COMPLETO_NOVA_ERA',
    client_tier: 'POPULAR',
    deal_value: 1500,
    created_at: '2024-02-10T10:00:00.000Z',
    activated_at: null,
  },
  {
    id: 'crm-encerrado-1',
    client_name: 'Clinica Saude Total',
    clinic_name: null,
    status_operacional: 'ENCERRADO',
    onboarding_stage: 'ATIVO',
    churn_status: 'CONFIRMED',
    churn_reason: 'Preco alto',
    team_id: 'tropa-de-elite',
    pacote: 'ATENDIMENTO',
    client_tier: null,
    deal_value: 3000,
    created_at: '2024-03-05T10:00:00.000Z',
    activated_at: null,
  },
  {
    id: 'crm-pausado-1',
    client_name: 'Dr. Paulo Medicina',
    clinic_name: 'Clinica Sao Paulo',
    status_operacional: 'PAUSADO',
    onboarding_stage: 'ATIVO',
    team_id: 'tropa-de-elite',
    pacote: 'TRAFEGO',
    client_tier: 'PREMIUM',
    deal_value: 2500,
    created_at: '2024-04-01T10:00:00.000Z',
    activated_at: null,
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

function visitCRM() {
  cy.visit('/operacional/crm', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(TEST_ADMIN))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_operational_clients', JSON.stringify(SEED_CLIENTS))
      win.sessionStorage.setItem('crm-team-filter', 'all')
    },
  })

  cy.contains('CRM Operacional', { timeout: 15000 }).should('be.visible')
}

function getStatCard(label: RegExp | string) {
  return cy.contains('span', label).closest('div.bg-card')
}

function openNewClientDialog() {
  cy.contains('button', 'Novo Cliente').click()
  cy.get('[role="dialog"]').should('be.visible')
}

function fillRequiredClientFields(clientName: string, date = '2024-06-01') {
  cy.get('[role="dialog"]').within(() => {
    cy.get('input').first().clear().type(clientName)
    cy.get('button[role="combobox"]').eq(0).click()
  })
  cy.contains('[role="option"]', 'Completo').click()

  cy.get('[role="dialog"]').within(() => {
    cy.get('button[role="combobox"]').eq(1).click()
  })
  cy.contains('[role="option"]', 'Equipe 7').click()

  cy.get('[role="dialog"]').within(() => {
    cy.get('button[role="combobox"]').eq(2).click()
  })
  cy.contains('[role="option"]', 'Cliente').click()

  cy.get('[role="dialog"]').within(() => {
    cy.get('button[role="combobox"]').eq(3).click()
  })
  cy.contains('[role="option"]', '30 Dias').click()
  cy.get('[role="dialog"]').find('input[type="date"]').clear().type(date)
}

describe('CRM - Estatisticas e Novo Cliente', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitCRM()
  })

  it('exibe o titulo CRM Operacional e subtitulo correto', () => {
    cy.contains('h1', 'CRM Operacional').should('be.visible')
    cy.contains(/clientes e eventos/i).should('be.visible')
  })

  it('exibe o botao Novo Cliente', () => {
    cy.contains('button', 'Novo Cliente').should('be.visible')
  })

  it('exibe os quatro cards de estatisticas com rotulos corretos', () => {
    cy.contains('Total').should('be.visible')
    cy.contains(/Em Ativa..o/i).should('be.visible')
    cy.contains('Ativos').should('be.visible')
    cy.contains('Encerrados').should('be.visible')
  })

  it('os cards exibem numeros validos', () => {
    cy.get('div.bg-card p.text-2xl.font-bold.text-foreground').each(($el) => {
      const num = Number.parseInt($el.text().trim(), 10)
      expect(Number.isNaN(num)).to.equal(false)
      expect(num).to.be.gte(0)
    })
  })

  it('Total = 2 e Encerrados = 1 com os dados de seed', () => {
    getStatCard('Total').find('p.text-2xl.font-bold.text-foreground').should('have.text', '2')
    getStatCard('Encerrados').find('p.text-2xl.font-bold.text-foreground').should('have.text', '1')
  })

  it('abre o dialog Novo Cliente Operacional ao clicar no botao', () => {
    openNewClientDialog()
    cy.contains('Novo Cliente Operacional').should('be.visible')
  })

  it('o dialog exibe todos os campos obrigatorios', () => {
    openNewClientDialog()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Nome do Cliente').should('be.visible')
      cy.contains('Pacote').should('be.visible')
      cy.contains('Equipe').should('be.visible')
      cy.contains(/Pagador de An.ncio/i).should('be.visible')
      cy.contains(/Per.odo/i).should('be.visible')
      cy.contains('Data de Entrada').should('be.visible')
    })
  })

  it('o Total sobe apos adicionar um novo cliente', () => {
    openNewClientDialog()
    fillRequiredClientFields('Cypress Nova Clinica')
    cy.contains('button', 'Cadastrar Cliente').click()
    cy.get('[role="dialog"]').should('not.exist')

    getStatCard('Total').find('p.text-2xl.font-bold.text-foreground').should('have.text', '3')
  })

  it('cadastra novo cliente, fecha o dialog e dispara confetes', () => {
    openNewClientDialog()
    fillRequiredClientFields('Clinica Cypress Confete', '2024-06-15')
    cy.contains('button', 'Cadastrar Cliente').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('canvas', { timeout: 5000 }).should('exist')
  })

  it('cadastra novo cliente e o registro aparece na planilha', () => {
    openNewClientDialog()
    fillRequiredClientFields('Clinica Cypress Listagem', '2024-06-20')
    cy.contains('button', 'Cadastrar Cliente').click()
    cy.get('[role="dialog"]').should('not.exist')

    cy.get('input[placeholder*="Buscar"]').type('Listagem')
    cy.contains('table', 'Clinica Cypress Listagem').should('be.visible')
  })
})
