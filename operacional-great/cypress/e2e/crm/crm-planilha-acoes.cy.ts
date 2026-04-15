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

// ─────────────────────────────────────────────────────────────────────────────
describe('CRM — Planilha e Ações', () => {
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
    cy.contains('Clínica Bella Vita', { timeout: 10000 }).should('be.visible')
  })

  // ── Colunas da planilha ────────────────────────────────────────────────────

  it('exibe todas as colunas (CLIENTE, STATUS, PACOTE, TIER, EQUIPE, ENTRADA, AÇÕES)', () => {
    cy.get('th').contains('CLIENTE').should('be.visible')
    cy.get('th').contains('STATUS').should('be.visible')
    cy.get('th').contains('PACOTE').should('be.visible')
    cy.get('th').contains('TIER').should('be.visible')
    cy.get('th').contains('EQUIPE').should('be.visible')
    cy.get('th').contains('ENTRADA').should('be.visible')
    cy.get('th').contains('AÇÕES').should('be.visible')
  })

  it('coluna CLIENTE exibe os nomes dos clientes visíveis', () => {
    cy.contains('td', 'Clínica Bella Vita').should('be.visible')
    cy.contains('td', 'Odontoclínica Sorriso').should('be.visible')
  })

  it('coluna STATUS exibe selects de status para cada linha', () => {
    cy.get('table tbody tr').each(($row) => {
      cy.wrap($row).find('button[role="combobox"]').should('exist')
    })
  })

  it('coluna PACOTE exibe o badge do pacote', () => {
    cy.contains('Completo').should('be.visible')
  })

  it('coluna TIER exibe o tier de clientes que possuem', () => {
    cy.contains('Premium').should('be.visible')
  })

  it('coluna EQUIPE exibe o nome da equipe', () => {
    cy.contains('td', 'Equipe 7').should('be.visible')
  })

  it('coluna ENTRADA exibe data formatada (dd/MM/yy)', () => {
    cy.get('table tbody tr').first().find('td').then(($tds) => {
      const textos = Array.from($tds).map((el) => el.textContent || '')
      const temData = textos.some((t) => /\d{2}\/\d{2}\/\d{2}/.test(t))
      expect(temData).to.equal(true)
    })
  })

  it('coluna AÇÕES exibe botões de ação para cada linha', () => {
    cy.get('button[title="Ver detalhes"]').should('have.length.gte', 1)
    cy.get('button[title="Adicionar criativo"]').should('have.length.gte', 1)
    cy.get('button[title="Adicionar evento"]').should('have.length.gte', 1)
  })

  // ── Ver Detalhes ───────────────────────────────────────────────────────────

  it('botão "Ver detalhes" navega para a página de detalhe do cliente', () => {
    cy.get('button[title="Ver detalhes"]').first().click()
    cy.url({ timeout: 10000 }).should('include', '/operacional/crm/cliente/')
  })

  it('clicar no nome do cliente na tabela navega para seus detalhes', () => {
    cy.contains('td', 'Clínica Bella Vita').find('button').click()
    cy.url({ timeout: 10000 }).should('include', '/operacional/crm/cliente/')
  })

  // ── Adicionar Criativo ─────────────────────────────────────────────────────

  it('botão "Adicionar criativo" abre o dialog com nome do cliente', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Adicionar Criativo').should('be.visible')
    cy.get('[role="dialog"]').invoke('text').then((texto) => {
      expect(texto).to.match(/Clínica Bella Vita|Odontoclínica Sorriso/)
    })
  })

  it('o dialog de criativo exibe o select de responsável e área de upload', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Responsável pela Arte').should('be.visible')
    cy.contains('Clique para selecionar arquivos').should('be.visible')
  })

  it('fechar o dialog de criativo funciona corretamente', () => {
    cy.get('button[title="Adicionar criativo"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })

  // ── Adicionar Evento ───────────────────────────────────────────────────────

  it('botão "Adicionar evento" abre o dialog com nome do cliente', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Adicionar Evento').should('be.visible')
    cy.contains('Cliente:').should('be.visible')
  })

  it('o dialog de evento exibe campos de tipo, título e descrição', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Tipo de Evento').should('be.visible')
      cy.contains('Título').should('be.visible')
      cy.contains('Descrição').should('be.visible')
    })
  })

  it('pode adicionar um evento e fechar o dialog', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('[role="dialog"]').within(() => {
      cy.get('input[placeholder*="Descreva o evento"]').type('Reunião de alinhamento mensal')
      cy.contains('button', 'Adicionar').click()
    })

    cy.get('[role="dialog"]').should('not.exist')
  })

  it('fechar o dialog de evento funciona corretamente', () => {
    cy.get('button[title="Adicionar evento"]').first().click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.get('[role="dialog"]').contains('button', 'Cancelar').click()
    cy.get('[role="dialog"]').should('not.exist')
  })
})
