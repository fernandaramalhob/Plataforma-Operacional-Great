declare namespace Cypress {
  interface Chainable {
    visitDashboard(): Chainable<void>
    loginUser(): Chainable<void>
    loginAdmin(): Chainable<void>
  }
}
