import "./api-client.test.mjs"
import "./client.schema.test.mjs"
import "./report-client.test.mjs"
import "./report-domain.test.mjs"
import "./report.schema.test.mjs"
import { runRegisteredTests } from "./test-helpers.mjs"

await runRegisteredTests()
