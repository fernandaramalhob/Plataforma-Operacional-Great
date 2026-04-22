import { execFileSync } from "child_process"
import { rm } from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, "..")
const lockPath = path.join(rootDir, ".next-local", "dev", "lock")

function run(command, args) {
  try {
    return execFileSync(command, args, { encoding: "utf8" })
  } catch {
    return ""
  }
}

function parseListeningPids(netstatOutput) {
  const pids = new Set()

  for (const line of netstatOutput.split(/\r?\n/)) {
    if (!line.includes("LISTENING")) {
      continue
    }

    if (!line.includes(":3000") && !line.includes(":3001")) {
      continue
    }

    const match = line.trim().match(/(\d+)$/)
    if (match) {
      pids.add(match[1])
    }
  }

  return [...pids]
}

async function removeLock() {
  try {
    await rm(lockPath, { force: true })
  } catch {
    // Ignore cleanup failures and let Next report the real startup error.
  }
}

async function main() {
  if (process.platform === "win32") {
    const pids = parseListeningPids(run("netstat", ["-ano"]))

    for (const pid of pids) {
      run("taskkill", ["/PID", pid, "/F"])
    }
  }

  await removeLock()
}

main().catch((error) => {
  console.error("[predev-clean] failed", error)
  process.exitCode = 1
})
