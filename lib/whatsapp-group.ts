function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, "")
}

export function normalizeWhatsAppGroupId(value: string | null | undefined) {
  if (!value) {
    return null
  }

  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return null
  }

  return /^(?:\d{10,25}-\d+|\d{12,30})@g\.us$/i.test(normalized)
    ? normalized
    : null
}
