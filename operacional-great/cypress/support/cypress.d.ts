declare namespace Cypress {
  interface Chainable {
    login(email?: string, password?: string): Chainable<void>
    loginAdmin(): Chainable<void>
    loginUser(): Chainable<void>
  }
}
