/// <reference types="cypress" />

describe('GreatGo - Site', () => {

  beforeEach(() => {
    cy.viewport(1280, 800)
    cy.visit('/login')
  })

  it('site deve redirecionar para o login', () => {
    cy.visit('/')
    cy.url().should('include', '/login')
  })

  it('página de login deve exibir os elementos principais', () => {
    // Evita depender de layout responsivo
    cy.contains('Acesse sua conta').should('be.visible')
    cy.contains('Entre com suas credenciais').should('be.visible')

    cy.get('input[type="email"]').should('be.visible')
    cy.get('input[type="password"]').should('be.visible')
    cy.get('button[type="submit"]').should('be.visible').and('contain', 'Entrar')
  })

  it('deve bloquear envio com campos vazios', () => {
    cy.get('button[type="submit"]').click()

    cy.url().should('include', '/login')

    cy.get('input[type="email"]')
      .invoke('prop', 'validity')
      .its('valid')
      .should('eq', false)
  })

  it('deve exibir erro com credenciais inválidas', () => {
    cy.get('input[type="email"]').type('invalido@teste.com')
    cy.get('input[type="password"]').type('senhaerrada123')
    cy.get('button[type="submit"]').click()

    cy.contains('Email ou senha incorretos.', { timeout: 10000 })
      .should('be.visible')
  })

  it('botão de mostrar/ocultar senha deve funcionar', () => {
    cy.get('input[type="password"]').should('exist')
    cy.get('input[type="password"]').closest('div').find('button').click()
    cy.get('input[type="text"]').should('exist')
  })
})