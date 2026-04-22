/// <reference types="cypress" />
export {}

const ADMIN = {
  id: 'test-admin-1',
  name: 'Admin Teste',
  email: 'admin@teste.com',
  role: 'ADMIN',
  active: true,
  createdAt: new Date().toISOString(),
}

const OUTRO_USUARIO = {
  id: 'user-destinatario-1',
  full_name: 'Maria Colaboradora',
  email: 'maria@teste.com',
  is_active: true,
  created_at: new Date().toISOString(),
}

function seedStorage(win: Window) {
  win.localStorage.clear()
  win.localStorage.setItem('great_user', JSON.stringify(ADMIN))
  win.localStorage.setItem('great_selected_module', 'OPERACIONAL')
  win.localStorage.setItem('mock_db_profiles', JSON.stringify([
    { id: ADMIN.id, full_name: ADMIN.name, email: ADMIN.email, is_active: true, created_at: new Date().toISOString() },
    OUTRO_USUARIO,
  ]))
  win.localStorage.setItem('mock_db_work_items', JSON.stringify([]))
  win.localStorage.setItem('mock_db_my_day_items', JSON.stringify([]))
}

describe('Dashboard – Adicionar tarefa para outro usuário', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/operacional/dashboard', {
      onBeforeLoad: (win) => seedStorage(win),
    })
    cy.contains('Operação Great', { timeout: 15000 }).should('be.visible')
  })

  it('cria tarefa atribuída a outro usuário e aparece no mock_db correto', () => {
    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')

    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa para Maria')
    cy.get('[data-cy="input-tarefa-descricao"]').type('Delegada pelo admin')

    // Seleciona o outro usuário no dropdown "Atribuir a"
    cy.get('[data-cy="select-assignee"]').click()
    cy.contains('[role="option"]', 'Maria Colaboradora').click()

    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    // Modal fecha — tarefa criada com sucesso
    cy.get('[data-cy="modal-nova-tarefa"]').should('not.exist')

    // Verifica que o work_item foi salvo com o assignee correto
    cy.window().then((win) => {
      const workItems = JSON.parse(win.localStorage.getItem('mock_db_work_items') || '[]')
      expect(workItems).to.have.length(1)
      expect(workItems[0].title).to.equal('Tarefa para Maria')
      expect(workItems[0].assignee_user_id).to.equal(OUTRO_USUARIO.id)
    })

    // Verifica que o item foi adicionado ao Meu Dia da Maria
    cy.window().then((win) => {
      const myDayItems = JSON.parse(win.localStorage.getItem('mock_db_my_day_items') || '[]')
      expect(myDayItems).to.have.length(1)
      expect(myDayItems[0].user_id).to.equal(OUTRO_USUARIO.id)
      expect(myDayItems[0].title).to.equal('Tarefa para Maria')
      expect(myDayItems[0].source).to.equal('WORK_ITEM')
    })
  })

  it('bloqueia criação de tarefa sem responsável e exibe erro', () => {
    cy.get('[data-cy="acao-rapida-nova-tarefa"]').click()
    cy.get('[data-cy="modal-nova-tarefa"]').should('be.visible')

    cy.get('[data-cy="input-tarefa-titulo"]').type('Tarefa sem dono')
    // Não seleciona nenhum responsável — clica direto em salvar
    cy.get('[data-cy="btn-salvar-tarefa"]').click()

    // Modal deve continuar aberto (validação impediu o envio)
    cy.get('[data-cy="modal-nova-tarefa"]').should('exist')
    cy.contains('Selecione um responsável para a tarefa').should('be.visible')

    // Nenhum item criado no banco
    cy.window().then((win) => {
      const workItems = JSON.parse(win.localStorage.getItem('mock_db_work_items') || '[]')
      expect(workItems).to.have.length(0)
    })
  })
})
