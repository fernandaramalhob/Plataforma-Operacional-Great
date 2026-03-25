import assert from "node:assert/strict"

const registeredTests = []

export { assert }

export function test(name, run) {
  registeredTests.push({ name, run })
}

export async function runRegisteredTests() {
  let failed = 0

  for (const registeredTest of registeredTests) {
    try {
      await registeredTest.run()
      console.log(`ok - ${registeredTest.name}`)
    } catch (error) {
      failed += 1
      console.error(`not ok - ${registeredTest.name}`)
      console.error(error instanceof Error ? error.stack : error)
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} teste(s) falharam`)
  }

  console.log(`${registeredTests.length} teste(s) passaram`)
}
