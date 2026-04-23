import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"

const META_TOKEN_PREFIX = "enc:v1"
const META_TOKEN_IV_LENGTH = 12
const META_TOKEN_PRESET_PREFIX = "preset:v1"

export type MetaTokenSource = "environment" | "database"
export type MetaTokenPreset = "ISAQUE" | "BRAYTON"

type ParsedEncryptedMetaToken = {
  ivBase64: string
  authTagBase64: string
  encryptedBase64: string
}

function getMetaTokenEncryptionSecret() {
  const secret =
    process.env.META_TOKEN_ENCRYPTION_KEY?.trim()
    || process.env.NEXTAUTH_SECRET?.trim()

  if (!secret) {
    throw new Error(
      "Configure META_TOKEN_ENCRYPTION_KEY ou NEXTAUTH_SECRET para proteger tokens META."
    )
  }

  return createHash("sha256").update(secret).digest()
}

export function isEncryptedMetaToken(value: string) {
  return value.startsWith(`${META_TOKEN_PREFIX}:`)
}

function parseEncryptedMetaToken(storedToken: string): ParsedEncryptedMetaToken {
  const prefixWithSeparator = `${META_TOKEN_PREFIX}:`

  if (!storedToken.startsWith(prefixWithSeparator)) {
    throw new Error("Formato de token META criptografado invalido")
  }

  const payload = storedToken.slice(prefixWithSeparator.length)
  const [ivBase64, authTagBase64, encryptedBase64] = payload.split(":")

  if (!ivBase64 || !authTagBase64 || !encryptedBase64) {
    throw new Error("Formato de token META criptografado invalido")
  }

  return {
    ivBase64,
    authTagBase64,
    encryptedBase64,
  }
}

function parseMetaTokenPreset(storedToken: string): MetaTokenPreset | null {
  if (!storedToken.startsWith(`${META_TOKEN_PRESET_PREFIX}:`)) {
    return null
  }

  const preset = storedToken.slice(`${META_TOKEN_PRESET_PREFIX}:`.length).trim()

  if (preset === "ISAQUE" || preset === "BRAYTON") {
    return preset
  }

  return null
}

export function getMetaTokenPresetFromStoredToken(storedToken: string | null) {
  if (!storedToken) {
    return null
  }

  return parseMetaTokenPreset(storedToken.trim())
}

function buildPresetToken(preset: MetaTokenPreset) {
  return `${META_TOKEN_PRESET_PREFIX}:${preset}`
}

function getPresetTokenFromEnv(preset: MetaTokenPreset) {
  if (preset === "ISAQUE") {
    return process.env.META_ACCESS_TOKEN_ISAQUE?.trim() ?? null
  }

  if (preset === "BRAYTON") {
    return process.env.META_ACCESS_TOKEN_BRAYTON?.trim() ?? null
  }

  return null
}

export function getMetaTokenPresetLabel(preset: MetaTokenPreset) {
  return preset === "ISAQUE" ? "Isaque" : "Brayton"
}

export function isMetaTokenPresetToken(value: string) {
  return parseMetaTokenPreset(value) !== null
}

export function createMetaTokenPresetToken(preset: MetaTokenPreset) {
  return buildPresetToken(preset)
}

export function getMetaAccessTokenFromEnv(preset?: MetaTokenPreset | null) {
  if (preset) {
    return getPresetTokenFromEnv(preset)
  }

  const envToken = process.env.META_ACCESS_TOKEN?.trim()

  if (!envToken) {
    return null
  }

  return resolveMetaToken(envToken).token
}

export function encryptMetaToken(token: string) {
  const sanitizedToken = token.trim()

  if (!sanitizedToken) {
    throw new Error("Token META obrigatorio")
  }

  const iv = randomBytes(META_TOKEN_IV_LENGTH)
  const cipher = createCipheriv("aes-256-gcm", getMetaTokenEncryptionSecret(), iv)
  const encrypted = Buffer.concat([
    cipher.update(sanitizedToken, "utf8"),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    META_TOKEN_PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    encrypted.toString("base64"),
  ].join(":")
}

export function decryptMetaToken(storedToken: string) {
  const sanitizedStoredToken = storedToken.trim()

  if (!sanitizedStoredToken) {
    throw new Error("Token META vazio")
  }

  if (!isEncryptedMetaToken(sanitizedStoredToken)) {
    return sanitizedStoredToken
  }

  const { ivBase64, authTagBase64, encryptedBase64 } =
    parseEncryptedMetaToken(sanitizedStoredToken)

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getMetaTokenEncryptionSecret(),
    Buffer.from(ivBase64, "base64"),
    { authTagLength: 16 }
  )

  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"))

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]).toString("utf8")

  if (!decrypted.trim()) {
    throw new Error("Falha ao descriptografar token META")
  }

  return decrypted.trim()
}

export function resolveMetaToken(storedToken: string) {
  const sanitizedStoredToken = storedToken.trim()

  const preset = parseMetaTokenPreset(sanitizedStoredToken)
  if (preset) {
    const token = getPresetTokenFromEnv(preset)

    if (!token) {
      throw new Error(
        `Token META ${getMetaTokenPresetLabel(preset)} nao configurado no ambiente.`
      )
    }

    return {
      token,
      encryptedToken: null,
    }
  }

  if (isEncryptedMetaToken(sanitizedStoredToken)) {
    return {
      token: decryptMetaToken(sanitizedStoredToken),
      encryptedToken: null,
    }
  }

  return {
    token: sanitizedStoredToken,
    encryptedToken: encryptMetaToken(sanitizedStoredToken),
  }
}

export function getMetaTokenFromCandidates(
  ...storedTokens: Array<string | null | undefined>
) {
  return resolveMetaTokenCandidate(...storedTokens)?.token ?? null
}

export function resolveMetaTokenCandidate(
  ...storedTokens: Array<string | null | undefined>
) {
  for (let index = 0; index < storedTokens.length; index += 1) {
    const storedToken = storedTokens[index]

    if (typeof storedToken === "string" && storedToken.trim()) {
      return {
        ...resolveMetaToken(storedToken),
        index,
        source: "database" as const,
      }
    }
  }

  const environmentToken = getMetaAccessTokenFromEnv()

  if (environmentToken) {
    return {
      token: environmentToken,
      encryptedToken: null,
      index: -1,
      source: "environment" as const,
    }
  }

  return null
}

export function hasConfiguredMetaToken(
  ...storedTokens: Array<string | null | undefined>
) {
  return resolveMetaTokenCandidate(...storedTokens) !== null
}
