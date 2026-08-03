export async function downloadReportPdfFromApi(params: {
  reportId: string
  fileName: string
}) {
  const response = await fetch(`/api/reports/${params.reportId}/pdf`, {
    cache: "no-store",
  })

  if (!response.ok) {
    const fallbackMessage = "Não foi possível gerar o PDF do relatório."

    try {
      const payload = (await response.json()) as { error?: unknown }
      if (typeof payload?.error === "string" && payload.error.trim()) {
        throw new Error(payload.error)
      }
    } catch {
      // Ignore JSON parsing failures and use the generic fallback below.
    }

    throw new Error(fallbackMessage)
  }

  const blob = await response.blob()
  if (!blob.size) {
    throw new Error("O PDF gerado está vazio.")
  }

  const contentType = response.headers.get("content-type") || blob.type
  if (contentType && !contentType.includes("application/pdf")) {
    throw new Error("O arquivo retornado não é um PDF válido.")
  }

  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement("a")
    anchor.href = objectUrl
    anchor.download = params.fileName
    anchor.rel = "noreferrer"
    anchor.click()
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
