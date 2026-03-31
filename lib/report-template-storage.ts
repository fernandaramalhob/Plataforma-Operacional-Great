import type { ReportTemplateDraft } from "@/types/report.types"

const STORAGE_PREFIX = "greatgo:report-template:"

function getStorageKey(clientId: string) {
  return `${STORAGE_PREFIX}${clientId}`
}

export function loadReportTemplate(clientId: string) {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(clientId))
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as ReportTemplateDraft
  } catch {
    return null
  }
}

export function saveReportTemplate(clientId: string, template: ReportTemplateDraft) {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    getStorageKey(clientId),
    JSON.stringify({
      ...template,
      updatedAt: new Date().toISOString(),
    } satisfies ReportTemplateDraft)
  )
}
