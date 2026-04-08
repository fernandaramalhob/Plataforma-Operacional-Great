process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/greatgo_test"
process.env.DIRECT_URL ??= process.env.DATABASE_URL

await import("./api-client.test.mjs")
await import("./admin-user.test.mjs")
await import("./auth.schema.test.mjs")
await import("./client.schema.test.mjs")
await import("./evolution-api.test.mjs")
await import("./meta-token-status.test.mjs")
await import("./report-automation.test.mjs")
await import("./report-client.test.mjs")
await import("./report-domain.test.mjs")
await import("./report-pdf-server.test.mjs")
await import("./report-pdf-preview-server.test.mjs")
await import("./report.schema.test.mjs")
await import("./session-user.test.mjs")

const { runRegisteredTests } = await import("./test-helpers.mjs")

await runRegisteredTests()
