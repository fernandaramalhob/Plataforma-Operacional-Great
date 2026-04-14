/// <reference types="cypress" />

describe('Meu Dia – Funcionário comum', () => {

  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('user', () => {
      cy.loginUser()
    })

    cy.visit('/operacional/meu-dia')
  })

  it('deve carregar a página corretamente', () => {
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
    cy.contains('Pendentes').should('be.visible')
    cy.contains('Concluídas').should('be.visible')
  })

  it('deve adicionar tarefa (botão e Enter)', () => {
    const titulo1 = `Tarefa ${Date.now()}`
    const titulo2 = `Tarefa Enter ${Date.now()}`

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(titulo1)

    cy.contains('Adicionar').click()
    cy.contains(titulo1).should('be.visible')

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(`${titulo2}{enter}`)

    cy.contains(titulo2).should('be.visible')
  })

  it('deve abrir dialog de tarefa fixa e selecionar tipo', () => {
    cy.contains('Tarefa Fixa').click()

    cy.contains('Nova Tarefa').should('be.visible')

    // Abre o Select de tipo (o trigger que contém "Normal (apenas hoje)")
    cy.contains('Normal (apenas hoje)')
      .closest('button[role="combobox"]')
      .click()

    cy.contains('Fixa (repete diariamente)').click()
    cy.contains('Esta tarefa aparecerá automaticamente todos os dias.')
      .should('be.visible')
  })

  it('deve atualizar contadores ao adicionar e concluir tarefa', () => {
    const titulo = `Teste ${Date.now()}`

    cy.contains('Pendentes')
      .parent()
      .find('p.text-kpi-sm')
      .invoke('text')
      .then((pendentesAntes) => {

        cy.get('input[placeholder="Adicionar item rápido..."]')
          .type(`${titulo}{enter}`)

        cy.contains(titulo).should('be.visible')

        cy.contains('Pendentes')
          .parent()
          .find('p.text-kpi-sm')
          .should(($el) => {
            expect(parseInt($el.text())).to.eq(parseInt(pendentesAntes) + 1)
          })

        cy.contains('Concluídas')
          .parent()
          .find('p.text-kpi-sm')
          .invoke('text')
          .then((concluidasAntes) => {

            // O card inteiro é clicável (onClick no div), não existe botão de toggle
            cy.contains(titulo).closest('.cursor-pointer').click()

            cy.contains('Concluídas')
              .parent()
              .find('p.text-kpi-sm')
              .should(($el) => {
                expect(parseInt($el.text())).to.eq(parseInt(concluidasAntes) + 1)
              })
          })
      })
  })

  it('deve disparar confete ao concluir tarefa', () => {
    const titulo = `Confete ${Date.now()}`

    cy.get('input[placeholder="Adicionar item rápido..."]')
      .type(`${titulo}{enter}`)

    cy.contains(titulo).should('be.visible')

    // O card inteiro é clicável (onClick no div)
    cy.contains(titulo).closest('.cursor-pointer').click()

    // Tarefa concluída = título com line-through (mesma linha de código que dispara o confete)
    cy.contains(titulo).should('have.class', 'line-through')

    // canvas-confetti injeta um <canvas> no DOM durante a animação
    cy.get('canvas', { timeout: 5000 }).should('exist')
  })

  it('panorama deve funcionar (abas e visibilidade)', () => {
    cy.contains('Panorama').click()

    cy.contains('Panorama da Minha Equipe').should('be.visible')

    cy.contains('Semanal').click()
    cy.contains('esta semana').should('be.visible')

    cy.contains('Mensal').click()
    cy.contains('este mês').should('be.visible')

    cy.contains('Anual').click()
    cy.contains('este ano').should('be.visible')

    cy.get('[role="combobox"]').should('not.exist')
  })
})


// ─────────────────────────────────────────────────────────────

describe('Meu Dia – Administrador', () => {

  const MOCK_PROFILES = [
    { id: 'seed-user-1', full_name: 'Ana Funcionária', operational_role: 'GESTOR', team_id: 'team-1', is_active: true, created_at: new Date().toISOString() },
    { id: 'seed-user-2', full_name: 'Pedro Funcionário', operational_role: 'ATENDENTE', team_id: 'team-1', is_active: true, created_at: new Date().toISOString() },
  ]

  beforeEach(() => {
    cy.viewport(1280, 800)

    cy.session('admin', () => {
      cy.loginAdmin()
    })

    // 1ª visita: garante que o app carrega com a sessão do admin
    cy.visit('/operacional/meu-dia')

    // Seta os perfis no localStorage após a página carregar
    // (o mock client lê daqui quando o componente chama .from('profiles').select())
    cy.window().then((win) => {
      win.localStorage.setItem('mock_db_profiles', JSON.stringify(MOCK_PROFILES))
    })

    // Recarrega para o componente buscar os perfis recém-inseridos
    cy.reload()
    cy.contains('Meu Dia', { timeout: 15000 }).should('be.visible')
  })

  it('deve visualizar e trocar usuário', () => {
    cy.get('[role="combobox"]', { timeout: 10000 }).should('be.visible').click()

    // Aguarda pelo menos 2 opções: "Meu Dia" + os funcionários seedados
    cy.get('[role="option"]', { timeout: 10000 }).should('have.length.at.least', 2)

    // Clica em "Ana Funcionária" — após o clique o Radix remove o dropdown,
    // por isso NÃO encadeamos assertions depois do .click()
    cy.get('[role="option"]').contains('Ana Funcionária').click()

    // Verifica o resultado na página (elementos novos, não o dropdown que sumiu)
    cy.contains('Dia de Ana Funcionária', { timeout: 8000 }).should('be.visible')
    cy.contains('Visualizando o dia de').should('be.visible')
  })

  it('panorama do admin deve exibir múltiplas equipes', () => {
    cy.contains('Panorama').click()

    cy.contains('Panorama das Equipes').should('be.visible')

    cy.get('[class*="bg-card"]')
      .should('have.length.at.least', 2)

    cy.contains('Semanal').click()
    cy.contains('esta semana').should('be.visible')

    cy.contains('Anual').click()
    cy.contains('este ano').should('be.visible')
  })

  it('deve voltar para Meu Dia a partir do panorama', () => {
    cy.contains('Panorama').click()
    cy.contains('Meu Dia').last().click()

    cy.contains('Pendentes').should('be.visible')
  })
})