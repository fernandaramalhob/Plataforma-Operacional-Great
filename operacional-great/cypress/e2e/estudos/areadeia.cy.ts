/// <reference types="cypress" />
export {}

// ─────────────────────────────────────────────────────────────────────────────
describe('Great Study AI', () => {
  beforeEach(() => {
    cy.viewport(1280, 800)
    // Mesmo padrão dos testes de dashboard (cy.session + cy.loginAdmin)
    cy.session('admin-ia', () => { cy.loginAdmin() }, { cacheAcrossSpecs: false })
    cy.visit('/operacional/great-study-ai')
    cy.contains('Great Study AI', { timeout: 15000 }).should('be.visible')
  })

  // ── Estrutura inicial ──────────────────────────────────────────────────────

  it('exibe o titulo Great Study AI', () => {
    cy.contains('h1', 'Great Study AI').should('be.visible')
  })

  it('exibe o subtitulo do assistente', () => {
    cy.contains('setor operacional').should('be.visible')
  })

  it('exibe o botao Nova conversa', () => {
    cy.contains('button', 'Nova conversa').should('be.visible')
  })

  it('exibe a mensagem de estado vazio no sidebar', () => {
    cy.contains('Comece uma conversa').should('be.visible')
  })

  it('exibe o link para voltar para conteudos', () => {
    cy.contains('Voltar para conte').should('be.visible')
  })

  // ── Tela de boas-vindas ────────────────────────────────────────────────────

  it('exibe o titulo da tela de boas-vindas', () => {
    cy.contains('Estudo operacional com contexto do site').should('be.visible')
  })

  it('exibe os quick prompts sugeridos', () => {
    cy.contains('Resuma o processo ideal de onboarding operacional').should('be.visible')
    cy.contains('Monte um checklist').should('be.visible')
  })

  // ── Criar nova conversa ────────────────────────────────────────────────────

  it('clicar em Nova conversa adiciona uma conversa no sidebar', () => {
    cy.contains('button', 'Nova conversa').click()
    cy.get('aside').should('be.visible')
    // Após criar conversa, a lista de conversas aparece no sidebar (não mais o estado vazio)
    cy.contains('Comece uma conversa').should('not.exist')
  })

  it('apos criar conversa exibe a textarea para digitar mensagem', () => {
    cy.contains('button', 'Nova conversa').click()
    cy.get('textarea').should('be.visible')
  })

  it('pode criar multiplas conversas', () => {
    cy.contains('button', 'Nova conversa').click()
    cy.contains('button', 'Nova conversa').click()
    // Duas conversas criadas — ambas aparecem no sidebar
    cy.get('aside').find('button').filter(':contains("Nova conversa")').should('have.length', 1)
    // Sidebar deve ter pelo menos 2 itens de conversa
    cy.get('aside').find('[class*="group"]').should('have.length.gte', 2)
  })

  // ── Navegação ─────────────────────────────────────────────────────────────

  it('clicar em Voltar para conteudos navega para a area de estudos', () => {
    cy.contains('Voltar para conte').click()
    cy.url({ timeout: 8000 }).should('include', '/operacional/area-estudo')
  })
})
