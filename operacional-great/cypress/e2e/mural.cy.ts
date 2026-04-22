/// <reference types="cypress" />
export {}

type TestUser = {
  id: string
  name: string
  email: string
  role: string
  teamId?: string
  active: boolean
  createdAt: string
}

type AnnouncementSeed = {
  id: string
  title: string
  content: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  target_team: 'all' | 'equipe-7' | 'tropa-de-elite'
  created_by_user_id: string
  created_at: string
  updated_at: string
  is_active: boolean
  expires_at: string | null
}

const TEST_ADMIN: TestUser = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const TEST_USER: TestUser = {
  id: 'test-user-1',
  name: 'Usuario Teste',
  email: 'user@teste.com',
  role: 'ATENDENTE',
  teamId: 'equipe-7',
  active: true,
  createdAt: new Date().toISOString(),
}

const visitMural = (
  user: TestUser,
  announcements: AnnouncementSeed[] = [],
  profiles: Record<string, unknown>[] = []
) => {
  cy.visit('/operacional/mural-avisos', {
    onBeforeLoad(win) {
      win.localStorage.clear()
      win.localStorage.setItem('great_user', JSON.stringify(user))
      win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
      win.localStorage.setItem('mock_db_announcements', JSON.stringify(announcements))
      win.localStorage.setItem('mock_db_profiles', JSON.stringify(profiles))
    },
  })

  cy.contains('Mural de Avisos', { timeout: 15000 }).should('be.visible')
}

const openNewAnnouncementDialog = () => {
  cy.contains('Novo Aviso', { timeout: 10000 }).should('be.visible').click()
  cy.get('[role="dialog"]', { timeout: 10000 }).should('be.visible')
}

describe('Mural de Avisos', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
  })

  it('exibe estado vazio corretamente para admin', () => {
    visitMural(TEST_ADMIN)

    cy.contains('Nenhum aviso publicado').should('be.visible')
    cy.contains('Novo Aviso').should('be.visible')
  })

  it('permite criar um novo aviso para uma equipe especifica', () => {
    const titulo = `Aviso ${Date.now()}`
    const conteudo = 'Mensagem importante de teste'

    visitMural(TEST_ADMIN)
    openNewAnnouncementDialog()

    cy.get('#title').should('be.visible').type(titulo)
    cy.get('#content').should('be.visible').type(conteudo)

    cy.contains('Quem pode ver este aviso?')
      .parent()
      .find('button[role="combobox"]')
      .click()

    cy.get('[role="option"]').contains('Equipe 7').click()
    cy.contains('button', 'Publicar Aviso').click()

    cy.contains(titulo, { timeout: 10000 }).should('be.visible')
    cy.contains(conteudo).should('be.visible')
    cy.contains('Equipe 7').should('be.visible')
  })

  it('exibe avisos existentes e permite remover como admin', () => {
    const aviso: AnnouncementSeed = {
      id: 'announcement-admin-1',
      title: 'Aviso para deletar',
      content: 'Este aviso deve sumir',
      priority: 'high',
      target_team: 'all',
      created_by_user_id: TEST_ADMIN.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      expires_at: null,
    }

    visitMural(TEST_ADMIN, [aviso])

    cy.contains(aviso.title).should('be.visible')
    cy.contains(aviso.title)
      .closest('.relative')
      .within(() => {
        cy.get('button').last().click()
      })

    cy.contains(aviso.title).should('not.exist')
  })

  it('nao mostra controles de gerenciamento para usuario comum', () => {
    const avisoGlobal: AnnouncementSeed = {
      id: 'announcement-user-1',
      title: 'Aviso visivel para todos',
      content: 'Todos conseguem ler este aviso',
      priority: 'normal',
      target_team: 'all',
      created_by_user_id: TEST_ADMIN.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
      expires_at: null,
    }

    visitMural(TEST_USER, [avisoGlobal], [
      {
        id: TEST_USER.id,
        operational_role: 'ATENDENTE',
        team_id: 'equipe-7',
      },
    ])

    cy.contains('Novo Aviso').should('not.exist')
    cy.contains(avisoGlobal.title).should('be.visible')
    cy.contains(avisoGlobal.title)
      .closest('.relative')
      .within(() => {
        cy.get('button').should('not.exist')
      })
  })
})
