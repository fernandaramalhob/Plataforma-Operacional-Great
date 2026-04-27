/// <reference types="cypress" />

export {}

declare global {
  // Cypress relies on the global namespace for custom command augmentation.
  namespace Cypress {
    interface Chainable {
      login(email?: string, password?: string): Chainable<void>
    }
  }
}
