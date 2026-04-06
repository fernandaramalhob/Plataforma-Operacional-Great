import { execFile } from "node:child_process"
import { createHmac, timingSafeEqual } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { promisify } from "node:util"
import { logError } from "@/lib/safe-logger"

const execFileAsync = promisify(execFile)
const TOKEN_TTL_MS = 5 * 60 * 1000
const BROWSER_CANDIDATES = [
  process.env.CHROME_EXECUTABLE_PATH,
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
]

function getPdfRenderSecret() {
  const secret =
    process.env.REPORT_PDF_RENDER_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.REPORT_AUTOMATION_PASSWORD

  if (!secret) {
    throw new Error(
      "Defina REPORT_PDF_RENDER_SECRET, NEXTAUTH_SECRET, AUTH_SECRET ou REPORT_AUTOMATION_PASSWORD para gerar o PDF exato da pré-visualização."
    )
  }

  return secret
}

function getAutomationBaseUrl() {
  const baseUrl =
    process.env.REPORT_AUTOMATION_BASE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://127.0.0.1:3000"

  return baseUrl.trim().replace(/\/$/, "")
}

function resolveBrowserPath() {
  return BROWSER_CANDIDATES.find(
    (candidate): candidate is string => Boolean(candidate && existsSync(candidate))
  )
}

function signReportPayload(reportId: string, expiresAt: number) {
  return createHmac("sha256", getPdfRenderSecret())
    .update(`${reportId}.${expiresAt}`)
    .digest("hex")
}

export function createReportPdfAccessToken(
  reportId: string,
  expiresAt = Date.now() + TOKEN_TTL_MS
) {
  return `${expiresAt}.${signReportPayload(reportId, expiresAt)}`
}

export function verifyReportPdfAccessToken(reportId: string, token: string) {
  const [expiresAtRaw, signature] = token.split(".", 2)
  const expiresAt = Number(expiresAtRaw)

  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
    return false
  }

  const expectedSignature = signReportPayload(reportId, expiresAt)
  const actualBuffer = Buffer.from(signature, "utf8")
  const expectedBuffer = Buffer.from(expectedSignature, "utf8")

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return timingSafeEqual(actualBuffer, expectedBuffer)
}

export async function buildExactReportPdfBuffer(params: { reportId: string }) {
  const browserPath = resolveBrowserPath()

  if (!browserPath) {
    throw new Error(
      "Não foi encontrado um navegador compatível para gerar o PDF da pré-visualização."
    )
  }

  const token = createReportPdfAccessToken(params.reportId)
  const reportUrl = new URL(`/report-pdf/${params.reportId}`, getAutomationBaseUrl())
  reportUrl.searchParams.set("token", token)

  const tempDirectory = await mkdtemp(path.join(os.tmpdir(), "greatgo-report-pdf-"))
  const pdfPath = path.join(tempDirectory, "report.pdf")

  try {
    await execFileAsync(
      browserPath,
      [
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--disable-extensions",
        "--disable-background-networking",
        "--no-first-run",
        "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=12000",
        "--window-size=1440,2400",
        "--print-to-pdf-no-header",
        `--print-to-pdf=${pdfPath}`,
        reportUrl.toString(),
      ],
      {
        timeout: 120000,
        windowsHide: true,
        maxBuffer: 10 * 1024 * 1024,
      }
    )

    return await readFile(pdfPath)
  } catch (error) {
    logError("report-pdf-preview-server.build", error, {
      reportId: params.reportId,
      browserPath,
      reportUrl: reportUrl.toString(),
    })
    throw new Error(
      "Não foi possível gerar o PDF exato da pré-visualização do relatório."
    )
  } finally {
    await rm(tempDirectory, { recursive: true, force: true })
  }
}
