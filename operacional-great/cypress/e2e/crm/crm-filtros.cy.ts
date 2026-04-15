/// <reference types="cypress" />
export {}

// ── Dados de seed ─────────────────────────────────────────────────────────────
const SEED_CLIENTS = [
  {
    id: 'crm-ativo-1',
    client_name: 'Clínica Bella Vita',
    clinic_name: 'Bella Vita Estética',
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
    client_name: 'Odontoclínica Sorriso',
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
    client_name: 'Clínica Saúde Total',
    clinic_name: null,
    status_operacional: 'ENCERRADO',
    onboarding_stage: 'ATIVO',
    churn_status: 'CONFIRMED',
    churn_reason: 'Preço alto',
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
    clinic_name: 'Clínica São Paulo',
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

// ── Helpers de Select (shadcn) ────────────────────────────────────────────────
function abrirSelectPor(texto: string) {
  cy.contains('button[role="combobox"]', texto, { timeout: 8000 }).click()
}

function escolherOpcao(label: string) {
  cy.contains('[role="option"]', label, { timeout: 8000 }).click()
}

// ─────────────────────────────────────────────────────────────────────────────
describe('CRM — Busca e Filtros', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
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
    // Garante que os clientes visíveis (padrão: Ativos + Em Ativação) carregaram
    cy.contains('Clínica Bella Vita', { timeout: 10000 }).should('be.visible')
  })

  // ── Busca ─────────────────────────────────────────────────────────────────

  it('busca por nome do cliente filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Bella Vita')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('busca por nome da clínica filtra corretamente', () => {
    cy.get('input[placeholder*="Buscar"]').type('Sorriso Pleno')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  it('busca por texto inexistente exibe mensagem de nenhum resultado', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
  })

  it('limpar a busca restaura os clientes visíveis', () => {
    cy.get('input[placeholder*="Buscar"]').type('xyzABC_inexistente')
    cy.contains('Nenhum cliente encontrado').should('be.visible')
    cy.get('input[placeholder*="Buscar"]').clear()
    cy.contains('Clínica Bella Vita').should('be.visible')
  })

  // ── Filtros de Status ─────────────────────────────────────────────────────

  it('"Ativos + Em Ativação" (padrão) oculta Encerrados e Pausados', () => {
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Saúde Total').should('not.exist')
    cy.contains('Dr. Paulo Medicina').should('not.exist')
  })

  it('"Todos" exibe todos os clientes inclusive Encerrados e Pausados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
  })

  it('"Em Ativação" exibe apenas clientes em ativação', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Em Ativação')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Clínica Saúde Total').should('not.exist')
  })

  it('"Ativo" exibe apenas clientes ativos', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Ativo')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('"Pausado" exibe apenas clientes pausados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Pausado')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('"Encerrado" exibe apenas clientes encerrados', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Encerrado')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  // ── Filtro de Equipe ──────────────────────────────────────────────────────

  it('selecionar "Equipe 7" exibe apenas seus clientes', () => {
    // Primeiro abre todos para incluir encerrados/pausados
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')

    // Seleciona equipe (o trigger mostra placeholder "Equipe" quando valor é 'all')
    cy.get('button[role="combobox"]').contains(/^Equipe$/).click()
    escolherOpcao('Equipe 7')

    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Saúde Total').should('not.exist')
    cy.contains('Dr. Paulo Medicina').should('not.exist')
  })

  it('selecionar "Tropa de Elite" exibe apenas seus clientes', () => {
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')

    cy.get('button[role="combobox"]').contains(/^Equipe$/).click()
    escolherOpcao('Tropa de Elite')

    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Dr. Paulo Medicina').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  // ── Filtro de Pacote ──────────────────────────────────────────────────────

  it('exibe "Todos pacotes" por padrão no filtro de pacote', () => {
    cy.contains('button[role="combobox"]', 'Todos pacotes').should('be.visible')
  })

  it('"Todos pacotes" não restringe a lista padrão', () => {
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
  })

  it('"Completo" exibe apenas clientes com pacote COMPLETO', () => {
    abrirSelectPor('Todos pacotes')
    escolherOpcao('Completo')
    cy.contains('Clínica Bella Vita').should('be.visible')
    cy.contains('Odontoclínica Sorriso').should('not.exist')
  })

  it('"COMPLETO_NOVA_ERA" exibe apenas clientes desse pacote', () => {
    abrirSelectPor('Todos pacotes')
    escolherOpcao('COMPLETO_NOVA_ERA')
    cy.contains('Odontoclínica Sorriso').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })

  it('"Atendimento" exibe apenas clientes com pacote ATENDIMENTO', () => {
    // Precisa mostrar encerrados para ver Saúde Total
    abrirSelectPor('Ativos + Em Ativação')
    escolherOpcao('Todos')
    abrirSelectPor('Todos pacotes')
    escolherOpcao('Atendimento')
    cy.contains('Clínica Saúde Total').should('be.visible')
    cy.contains('Clínica Bella Vita').should('not.exist')
  })
})
