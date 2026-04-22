import { defineConfig } from "cypress"

export default defineConfig({
  allowCypressEnv: true,

  e2e: {
    baseUrl: "http://localhost:3000",
    pageLoadTimeout: 120000,
    responseTimeout: 60000,
    defaultCommandTimeout: 15000,
    setupNodeEvents(on, config) {
      on("task", {
        async buildNextAuthSession({
          email,
          password,
        }: {
          email?: string
          password?: string
        }) {
          const baseUrl = config.baseUrl ?? "http://localhost:3000"
          const response = await fetch(new URL("/api/test/login", baseUrl), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              password,
            }),
          })

          if (!response.ok) {
            const text = await response.text().catch(() => "")
            throw new Error(
              `Falha ao criar sessao de teste: ${response.status} ${text}`.trim()
            )
          }

          return response.json()
        },
      })

      return config
    },
  },
})
