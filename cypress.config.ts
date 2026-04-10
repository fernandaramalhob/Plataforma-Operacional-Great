import { defineConfig } from "cypress";

export default defineConfig({
  allowCypressEnv: false,

  e2e: {
    baseUrl: "http://localhost:3000",
    pageLoadTimeout: 60000,
    responseTimeout: 60000,
    defaultCommandTimeout: 15000,
    setupNodeEvents(_on, _config) {
      // implement node event listeners here
    },
  },
});

