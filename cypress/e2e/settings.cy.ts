const activeMetaStatus = {
  sessionUser: {
    id: "session-1",
    email: "braytonmaycon5@gmail.com",
    role: "ADMIN",
    name: "Admin GreatGo",
  },
  hasSavedToken: true,
  tokenStatus: "active",
  tokenMasked: "EAAA1...k12345",
  selectedPreset: "BRAYTON",
  metaUser: {
    id: "meta-user-1",
    name: "Bryton Maycon",
    email: "braytonmaycon5@gmail.com",
  },
  detail: "Token META ativo e validado com sucesso.",
  expiresAt: "2026-12-31T23:59:59.000Z",
}

const metaAccounts = [
  {
    id: "act_1001",
    name: "GreatGo - Conta principal",
    account_status: 1,
  },
  {
    id: "act_1002",
    name: "GreatGo - Conta reserva",
    account_status: 0,
  },
]

const evolutionResponse = {
  configured: true,
  connected: true,
  instance: "evo-main",
  detail: "2 grupo(s) encontrado(s) em 2 instancia(s).",
  groups: [
    {
      id: "evo-main::group-a",
      subject: "GreatGo | Operacao Central",
      size: 31,
      announce: false,
      instance: "evo-main",
    },
    {
      id: "evo-backup::group-b",
      subject: "GreatGo | Comercial",
      size: 18,
      announce: true,
      instance: "evo-backup",
    },
  ],
  instances: [
    { name: "evo-main", status: "open", isPrimary: true },
    { name: "evo-backup", status: "open", isPrimary: false },
  ],
}

function mockSettingsPage(initialStatus = activeMetaStatus) {
  cy.intercept("GET", "/api/settings/meta-token", initialStatus).as("metaStatus")
  cy.intercept("GET", "/api/settings/meta-account", metaAccounts).as("metaAccounts")
  cy.intercept("GET", "/api/settings/evolution", evolutionResponse).as("evolution")
}

describe("Settings", () => {
  beforeEach(() => {
    cy.viewport(1440, 1080)
    cy.login()
  })

  it("deve carregar sessão, token, Evolution, atualizar tudo e copiar ID de grupo", () => {
    mockSettingsPage()

    cy.visit("/dashboard/settings")
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.wait("@evolution")

    cy.contains("Configurações").should("be.visible")
    cy.contains("button", "Atualizar tudo").should("be.visible")
    cy.contains("Sessão atual").should("be.visible")
    cy.contains("Token salvo").should("be.visible")
    cy.contains("Token atual: Bryton").should("be.visible")
    cy.contains("Atualizar token").should("be.visible")
    cy.contains("Integração META Ads").should("be.visible")
    cy.contains("Conexão Evolution").should("be.visible")
    cy.contains("Contas de anúncios encontradas").should("be.visible")
    cy.contains("Grupos ativos na instância").should("be.visible")
    cy.contains("button", "Importar como cliente").should("be.visible")
    cy.contains("button", "Copiar ID").should("be.visible")

    cy.contains("button", "Atualizar tudo")
      .scrollIntoView()
      .click({ force: true })
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.wait("@evolution")
    cy.contains("Token atual: Bryton").should("be.visible")
  })

  it("deve alternar o preset META e validar um novo token", () => {
    let currentMetaStatus = { ...activeMetaStatus }

    cy.intercept("GET", "/api/settings/meta-token", (req) => {
      req.reply(currentMetaStatus)
    }).as("metaStatus")
    cy.intercept("GET", "/api/settings/meta-account", metaAccounts).as("metaAccounts")
    cy.intercept("GET", "/api/settings/evolution", evolutionResponse).as("evolution")

    cy.intercept("POST", "/api/settings/meta-token", (req) => {
      if (req.body?.preset) {
        expect(req.body.preset).to.eq("ISAQUE")

        currentMetaStatus = {
          ...activeMetaStatus,
          selectedPreset: "ISAQUE",
          tokenMasked: "EAAA2...t54321",
          metaUser: {
            id: "meta-user-2",
            name: "Isaque GreatGo",
            email: "isaque@greatgo.com",
          },
          detail: "Preset Isaque aplicado com sucesso.",
        }

        req.reply({
          statusCode: 200,
          body: {
            success: true,
            tokenStatus: "active",
            tokenMasked: "EAAA2...t54321",
            selectedPreset: "ISAQUE",
            metaUser: {
              id: "meta-user-2",
              name: "Isaque GreatGo",
              email: "isaque@greatgo.com",
            },
            expiresAt: "2026-12-31T23:59:59.000Z",
            detail: "Preset Isaque aplicado com sucesso.",
          },
        })
        return
      }

      expect(req.body?.token).to.match(/^EAA/)

      currentMetaStatus = {
        ...activeMetaStatus,
        selectedPreset: null,
        tokenMasked: "EAAA3...f67890",
        metaUser: {
          id: "meta-user-3",
          name: "Token Manual",
          email: "manual@greatgo.com",
        },
        detail: "Token manual validado com sucesso.",
      }

      req.reply({
        statusCode: 200,
        body: {
          success: true,
          tokenStatus: "active",
          tokenMasked: "EAAA3...f67890",
          selectedPreset: null,
          metaUser: {
            id: "meta-user-3",
            name: "Token Manual",
            email: "manual@greatgo.com",
          },
          expiresAt: "2026-12-31T23:59:59.000Z",
          detail: "Token manual validado com sucesso.",
        },
      })
    }).as("saveMetaToken")

    cy.visit("/dashboard/settings")
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.wait("@evolution")

    cy.contains("button", "Isaque").click({ force: true })
    cy.wait("@saveMetaToken")
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.contains("Token atual: Isaque").should("be.visible")
    cy.contains("Preset ativo: Isaque").should("be.visible")

    cy.get('input[type="password"]').clear().type("EAAmanualTokenValue123")
    cy.contains("button", "Atualizar token").click()
    cy.wait("@saveMetaToken")
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.contains("Token válido. Conectado como").should("be.visible")
    cy.contains("Token manual validado com sucesso.").should("be.visible")
  })

  it("deve importar uma conta META e exibir o status final", () => {
    mockSettingsPage()

    cy.intercept("POST", "/api/settings/import-client", {
      ok: true,
      imported: true,
    }).as("importClient")

    cy.visit("/dashboard/settings")
    cy.wait("@metaStatus")
    cy.wait("@metaAccounts")
    cy.wait("@evolution")

    cy.contains("button", "Importar como cliente").first().click()
    cy.wait("@importClient")
    cy.contains("button", "Importado").should("be.visible")
    cy.contains("Conta principal").should("be.visible")
    cy.contains("Status").should("be.visible")
  })
})
