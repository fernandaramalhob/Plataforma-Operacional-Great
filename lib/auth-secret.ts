function readEnvValue(value: string | undefined) {
  const normalizedValue = value?.trim()

  return normalizedValue ? normalizedValue : ""
}

export function getAuthSecret() {
  return (
    readEnvValue(process.env.NEXTAUTH_SECRET)
    || readEnvValue(process.env.AUTH_SECRET)
  )
}
