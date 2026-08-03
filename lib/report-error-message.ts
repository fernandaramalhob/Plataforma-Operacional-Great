const TECHNICAL_ERROR_PATTERNS = [
  /page\.goto/i,
  /networkidle/i,
  /ERR_[A-Z_]+/i,
  /Protocol error/i,
  /Call log:/i,
  /navigating to/i,
  /waiting until/i,
  /browserType\.launch/i,
  /Executable doesn't exist/i,
  /headless_shell/i,
]

const DEFAULT_REPORT_ERROR_MESSAGE =
  "Não foi possível gerar o relatório neste momento. Tente novamente."

export function getFriendlyReportErrorMessage(
  value: string | null | undefined,
  fallbackMessage = DEFAULT_REPORT_ERROR_MESSAGE
) {
  const message = value?.trim()

  if (!message) {
    return fallbackMessage
  }

  if (TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallbackMessage
  }

  return message
}