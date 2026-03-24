const SENSITIVE_KEY_PATTERN =
  /(token|secret|password|authorization|cookie|api[-_]?key|client[_-]?secret)/i

function redactString(value: string) {
  return value
    .replace(/(access_token=)([^&\s]+)/gi, "$1[REDACTED]")
    .replace(/(Bearer\s+)([^\s]+)/gi, "$1[REDACTED]")
    .replace(
      /(["']?(?:token|accessToken|authorization|password|secret|apiKey|cookie|clientSecret)["']?\s*[:=]\s*["']?)([^"',\s}]+)/gi,
      "$1[REDACTED]"
    )
    .replace(/\bEAA[A-Za-z0-9]+/g, "[REDACTED_META_TOKEN]")
}

export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (depth > 4) {
    return "[Truncated]"
  }

  if (typeof value === "string") {
    return redactString(value)
  }

  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    return value
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
      stack: value.stack ? redactString(value.stack) : undefined,
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLog(item, depth + 1))
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, currentValue]) => [
        key,
        SENSITIVE_KEY_PATTERN.test(key)
          ? "[REDACTED]"
          : sanitizeForLog(currentValue, depth + 1),
      ])
    )
  }

  return String(value)
}

export function logError(context: string, error: unknown, extra?: unknown) {
  if (typeof extra === "undefined") {
    console.error(`[${context}]`, sanitizeForLog(error))
    return
  }

  console.error(`[${context}]`, sanitizeForLog(extra), sanitizeForLog(error))
}
