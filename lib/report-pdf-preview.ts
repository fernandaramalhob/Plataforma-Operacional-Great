import { createHmac, timingSafeEqual } from "node:crypto"
import { prisma } from "@/lib/prisma"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { buildStandardReportPdfBuffer } from "@/lib/report-pdf-standard"
import { logError, logInfo } from "@/lib/safe-logger"

const TOKEN_TTL_MS = 5 * 60 * 1000

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

function validatePdfBuffer(pdfBuffer: Uint8Array, reportId: string) {
  if (!(pdfBuffer instanceof Uint8Array)) {
    throw new Error("O buffer do PDF é inválido.")
  }

  if (pdfBuffer.byteLength === 0) {
    throw new Error("O PDF gerado está vazio.")
  }

  if (
    pdfBuffer[0] !== 0x25 ||
    pdfBuffer[1] !== 0x50 ||
    pdfBuffer[2] !== 0x44 ||
    pdfBuffer[3] !== 0x46
  ) {
    throw new Error("O PDF gerado não começou com a assinatura esperada.")
  }

  logInfo("report-pdf-preview.validate", {
    reportId,
    size: pdfBuffer.byteLength,
  })
}

export async function buildPreviewReportPdfBuffer(params: { reportId: string }) {
  try {
    logInfo("report-pdf-preview.build", {
      reportId: params.reportId,
      step: "starting-standard-generation",
    })

    const report = await prisma.report.findUnique({
      where: { id: params.reportId },
      select: {
        id: true,
        payloadJson: true,
      },
    })

    if (!report) {
      throw new Error("Relatório não encontrado para gerar o PDF.")
    }

    const payload = parseStoredReportPayload(report.payloadJson)

    if (!payload) {
      throw new Error("Relatório ainda está em processamento.")
    }

    const pdfBuffer = buildStandardReportPdfBuffer({
      reportId: params.reportId,
      payload,
    })

    validatePdfBuffer(pdfBuffer, params.reportId)

    logInfo("report-pdf-preview.build", {
      reportId: params.reportId,
      step: "completed",
      size: pdfBuffer.byteLength,
    })

    return pdfBuffer
  } catch (error) {
    logError("report-pdf-preview.build", error, {
      reportId: params.reportId,
    })
    throw new Error(
      "Não foi possível gerar o PDF da pré-visualização do relatório."
    )
  }
}
