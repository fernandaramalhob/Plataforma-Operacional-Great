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
  cy.contains(/Clinica Bella Vita|Cl.nica Bella Vita/i, { timeout: 10000 }).should('be.visible')
}

function abrirSelectPorIndice(indice: number) {
  cy.get('button[role="combobox"]').eq(indice).click()
}

function escolherOpcao(label: string | RegExp) {
  cy.contains('[role="option"]', label, { timeout: 8000 }).click()
}

function escolherStatusPorIndice(indice: number) {
  cy.get('[role="option"]').eq(indice).click()
}

describe('CRM - Busca e Filtros', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    visitCRM()
  })

  it('busca por nome do cliente filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Bella Vita')
    cy.get('tbody').should('contain', 'Bella Vita')
    cy.get('tbody').should('not.contain', 'Sorriso')
  })

  it('busca por nome da clinica filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Sorriso Pleno')
    cy.get('tbody').should('contain', 'Odontoclinica Sorriso')
    cy.get('tbody').should('not.contain', 'Bella Vita')
  })

  it('busca por texto inexistente exibe mensagem de nenhum resultado', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
  })

  it('limpar a busca restaura os clientes visiveis', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
    cy.get('input[placeholder*="Buscar"]').clear()
    cy.get('tbody').should('contain', 'Bella Vita')
  })

  it('Ativos + Em Ativacao oculta Encerrados e Pausados', () => {
    cy.get('tbody tr').should('have.length', 2)
    cy.get('tbody').should('contain', 'Bella Vita')
    cy.get('tbody').should('contain', 'Sorriso')
    cy.get('tbody').should('not.contain', 'Saude Total')
    cy.get('tbody').should('not.contain', 'Dr. Paulo Medicina')
  })

  it('Todos exibe todos os clientes inclusive Encerrados e Pausados', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(1)
    cy.get('tbody tr').should('have.length', 4)
  })

  it('Em Ativacao exibe apenas clientes em ativacao', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(2)
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Odontoclinica Sorriso')
  })

  it('Ativo exibe apenas clientes ativos', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(3)
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Clinica Bella Vita')
  })

  it('Pausado exibe apenas clientes pausados', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(4)
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Dr. Paulo Medicina')
  })

  it('Encerrado exibe apenas clientes encerrados', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(5)
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Clinica Saude Total')
  })

  it('selecionar Equipe 7 exibe apenas seus clientes', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(1)
    abrirSelectPorIndice(1)
    escolherOpcao('Equipe 7')
    cy.get('tbody tr').should('have.length', 2)
    cy.get('tbody').should('contain', 'Bella Vita')
    cy.get('tbody').should('contain', 'Sorriso')
  })

  it('selecionar Tropa de Elite exibe apenas seus clientes', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(1)
    abrirSelectPorIndice(1)
    escolherOpcao('Tropa de Elite')
    cy.get('tbody tr').should('have.length', 2)
    cy.get('tbody').should('contain', 'Saude Total')
    cy.get('tbody').should('contain', 'Dr. Paulo Medicina')
  })

  it('exibe Todos pacotes por padrao no filtro de pacote', () => {
    cy.contains('button[role="combobox"]', 'Todos pacotes').should('be.visible')
  })

  it('Todos pacotes nao restringe a lista padrao', () => {
    cy.get('tbody tr').should('have.length', 2)
  })

  it('Completo exibe apenas clientes com pacote COMPLETO', () => {
    abrirSelectPorIndice(2)
    escolherOpcao('Completo')
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Bella Vita')
  })

  it('COMPLETO_NOVA_ERA exibe apenas clientes desse pacote', () => {
    abrirSelectPorIndice(2)
    escolherOpcao('COMPLETO_NOVA_ERA')
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Sorriso')
  })

  it('Atendimento exibe apenas clientes com pacote ATENDIMENTO', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(1)
    abrirSelectPorIndice(2)
    escolherOpcao('Atendimento')
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Saude Total')
  })

  it('combina status, equipe e pacote sem misturar clientes de outros filtros', () => {
    abrirSelectPorIndice(0)
    escolherStatusPorIndice(1)
    abrirSelectPorIndice(1)
    escolherOpcao('Equipe 7')
    abrirSelectPorIndice(2)
    escolherOpcao('COMPLETO_NOVA_ERA')
    cy.get('tbody tr').should('have.length', 1)
    cy.get('tbody').should('contain', 'Odontoclinica Sorriso')
  })
})
