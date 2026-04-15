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
describe('CRM — Estatísticas e Novo Cliente', () => {
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
  })

  // ── Título e estrutura ─────────────────────────────────────────────────────

  it('exibe o título "CRM Operacional" e subtítulo correto', () => {
    cy.contains('h1', 'CRM Operacional').should('be.visible')
    cy.contains('Gestão de clientes e eventos').should('be.visible')
  })

  it('exibe o botão "Novo Cliente"', () => {
    cy.contains('button', 'Novo Cliente').should('be.visible')
  })

  // ── Cards de estatísticas ──────────────────────────────────────────────────

  it('exibe os quatro cards de estatísticas com rótulos corretos', () => {
    cy.contains('Total').should('be.visible')
    cy.contains('Em Ativação').should('be.visible')
    cy.contains('Ativos').should('be.visible')
    cy.contains('Encerrados').should('be.visible')
  })

  it('os cards exibem números válidos (≥ 0)', () => {
    cy.get('.text-2xl.font-bold').each(($el) => {
      const num = parseInt($el.text().trim(), 10)
      expect(isNaN(num)).to.equal(false)
      expect(num).to.be.gte(0)
    })
  })

  it('Total = 2 (ativo + em ativação) e Encerrados = 1 com os dados de seed', () => {
    cy.get('.text-2xl.font-bold').first().invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.equal(2)
    })
    cy.get('.text-2xl.font-bold').eq(3).invoke('text').then((t) => {
      expect(parseInt(t.trim(), 10)).to.equal(1)
    })
  })

  // ── Adicionar Novo Cliente ─────────────────────────────────────────────────

  it('abre o dialog "Novo Cliente Operacional" ao clicar no botão', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').should('be.visible')
    cy.contains('Novo Cliente Operacional').should('be.visible')
  })

  it('o dialog exibe todos os campos obrigatórios', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').within(() => {
      cy.contains('Nome do Cliente').should('be.visible')
      cy.contains('Pacote').should('be.visible')
      cy.contains('Equipe').should('be.visible')
      cy.contains('Pagador de Anúncio').should('be.visible')
      cy.contains('Período').should('be.visible')
      cy.contains('Data de Entrada').should('be.visible')
    })
  })

  it('o Total sobe após adicionar um novo cliente', () => {
    cy.get('.text-2xl.font-bold')
      .first()
      .invoke('text')
      .then((antes) => {
        const totalAntes = parseInt(antes.trim(), 10)

        cy.contains('button', 'Novo Cliente').click()
        cy.get('[role="dialog"]').should('be.visible')
        cy.get('[role="dialog"]').find('input').first().type('Cypress Nova Clínica')
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(0).click()
        cy.contains('[role="option"]', 'Completo').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(1).click()
        cy.contains('[role="option"]', 'Equipe 7').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(2).click()
        cy.contains('[role="option"]', 'Cliente').click()
        cy.get('[role="dialog"]').find('button[role="combobox"]').eq(3).click()
        cy.contains('[role="option"]', '30 Dias').click()
        cy.get('[role="dialog"]').find('input[type="date"]').type('2024-06-01')
        cy.contains('button', 'Cadastrar Cliente').click()
        cy.get('[role="dialog"]').should('not.exist')

        cy.get('.text-2xl.font-bold')
          .first()
          .invoke('text')
          .then((depois) => {
            expect(parseInt(depois.trim(), 10)).to.equal(totalAntes + 1)
          })
      })
  })

  it('cadastra novo cliente, fecha o dialog e dispara confetes', () => {
    cy.contains('button', 'Novo Cliente').click()
    cy.get('[role="dialog"]').should('be.visible')

    cy.get('[role="dialog"]').find('input').first().type('Clínica Cypress Confete')
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(0).click()
    cy.contains('[role="option"]', 'Completo').click()
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(1).click()
    cy.contains('[role="option"]', 'Equipe 7').click()
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(2).click()
    cy.contains('[role="option"]', 'Cliente').click()
    cy.get('[role="dialog"]').find('button[role="combobox"]').eq(3).click()
    cy.contains('[role="option"]', '30 Dias').click()
    cy.get('[role="dialog"]').find('input[type="date"]').type('2024-06-15')

    cy.contains('button', 'Cadastrar Cliente').click()
    cy.get('[role="dialog"]').should('not.exist')
    cy.get('canvas', { timeout: 5000 }).should('exist')
  })
})
