import { buildPreviewReportPdfBuffer } from "@/lib/report-pdf-preview"
import { buildStandardReportPdfBuffer } from "@/lib/report-pdf-standard"
import { logError } from "@/lib/safe-logger"
import type { StoredReportPayload } from "@/types/report.types"

export async function buildReportPdfBufferWithFallback(params: {
  reportId: string
  payload: StoredReportPayload
}) {
  try {
    return await buildPreviewReportPdfBuffer({
      reportId: params.reportId,
    })
  } catch (error) {
    logError("report-pdf-fallback.preview-fallback", error, {
      reportId: params.reportId,
    })

    return buildStandardReportPdfBuffer({
      reportId: params.reportId,
      payload: params.payload,
    })
  }
}
