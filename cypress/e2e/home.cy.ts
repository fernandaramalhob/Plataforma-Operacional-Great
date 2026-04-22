describe('GreatGo - Site', () => {
  it('site deve estar online e redirecionar para o login', () => {
    cy.visit('/')
    cy.url().should('include', '/login')
  })

  it('página de login deve exibir os elementos principais', () => {
    cy.visit('/login')

    cy.contains('GreatGo').should('be.visible')
    cy.contains('h1', 'Um painel mais claro para acompanhar clientes, mídia e relatórios.')
      .should('be.visible')
    cy.contains('h2', 'Entrar na plataforma').should('be.visible')
    cy.contains('Use sua conta cadastrada para acessar o painel operacional, clientes e integrações.')
      .should('be.visible')

    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Entrar')
  })

  it('deve exibir erro ao tentar entrar com campos vazios', () => {
    cy.visit('/login')

    cy.get('button[type="submit"]').click()

    cy.get('input[type="email"]')
      .closest('div')
      .parent()
      .find('p')
      .should('exist')
  })

  it('deve exibir erro com credenciais inválidas', () => {
    cy.visit('/login')

    cy.get('input[type="email"]').type('invalido@teste.com')
    cy.get('input[type="password"]').type('senhaerrada123')
    cy.get('button[type="submit"]').click()

    cy.contains('E-mail ou senha inválidos.', { timeout: 10000 }).should('be.visible')
  })

  it('botão de mostrar/ocultar senha deve funcionar', () => {
    cy.visit('/login')

    cy.get('input[type="password"]').should('exist')
    cy.get('input[type="password"]').closest('div').find('button').click()
    cy.get('input[type="text"]').should('exist')
  })
})
