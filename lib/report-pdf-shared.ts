function sanitizeFileNamePart(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
}

export function buildReportPdfFileName(input: {
  clientName: string
  startDate: string
  endDate: string
}) {
  return [
    "greatgo-relatorio-meta-ads",
    sanitizeFileNamePart(input.clientName),
    input.startDate,
    "a",
    input.endDate,
  ]
    .filter(Boolean)
    .join("-")
}
