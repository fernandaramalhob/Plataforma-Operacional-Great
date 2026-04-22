import {
  debugMetaToken,
  getMetaAppAccessToken,
  getMetaMeProfile,
  MetaApiError,
} from "@/lib/meta-api"
import { recordIntegrationAlertSafely } from "@/lib/integration-monitoring"
import {
  resolveMetaToken,
  resolveMetaTokenCandidate,
  type MetaTokenSource,
} from "@/lib/meta-token"
import { prisma } from "@/lib/prisma"
import { logError } from "@/lib/safe-logger"

const META_TOKEN_WARNING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export type MetaTokenStatus =
  | "missing"
  | "active"
  | "expiring_soon"
  | "expired"
  | "invalid"
  | "unknown"

export type MetaTokenOwner = {
  id: string
  metaAccessToken: string | null
  metaTokenExpiresAt: Date | null
}

export type MetaTokenUser = {
  id: string | null
  name: string | null
  email: string | null
}

export type MetaTokenHealth = {
  ok: boolean
  status: MetaTokenStatus
  detail: string | null
  expiresAt: Date | null
  token: string | null
  encryptedToken: string | null
  source: MetaTokenSource | null
  metaUser: MetaTokenUser | null
}

export function getMetaTokenReadErrorDetail(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  if (
    message.includes("unsupported state or unable to authenticate data") ||
    message.includes("invalid authentication tag") ||
    message.includes("descriptografar") ||
    message.includes("criptografado invalido")
  ) {
    return "O token META salvo nao pode ser lido neste ambiente. Confirme se META_TOKEN_ENCRYPTION_KEY ou NEXTAUTH_SECRET sao os mesmos do PC de origem, ou salve um novo token."
  }

  return "Nao foi possivel ler o token META salvo. Salve um novo token ou revise a configuracao deste ambiente."
}

function inferMetaTokenStatus(message: string): MetaTokenStatus {
  const lowerMessage = message.toLowerCase()

  if (
    lowerMessage.includes("session") ||
    lowerMessage.includes("expired") ||
    lowerMessage.includes("invalid oauth") ||
    lowerMessage.includes("invalid access token")
  ) {
    return "expired"
  }

  return "invalid"
}

function buildExpiryDetail(expiresAt: Date, prefix: string) {
  return `${prefix} em ${expiresAt.toLocaleString("pt-BR")}`
}

function buildEnvironmentTokenDetail(detail?: string | null) {
  const baseDetail = detail?.trim()

  if (!baseDetail) {
    return "Token META carregado de META_ACCESS_TOKEN."
  }

  return `${baseDetail} (via META_ACCESS_TOKEN).`
}

function isNearExpiry(expiresAt: Date | null) {
  if (!expiresAt) {
    return false
  }

  return expiresAt.getTime() - Date.now() <= META_TOKEN_WARNING_WINDOW_MS
}

function pickNearestExpiry(
  expiresAt?: number,
  dataAccessExpiresAt?: number
) {
  const candidates = [expiresAt, dataAccessExpiresAt]
    .filter((value): value is number => typeof value === "number" && value > 0)
    .map((value) => new Date(value * 1000))

  if (!candidates.length) {
    return null
  }

  return candidates.sort((left, right) => left.getTime() - right.getTime())[0]
}

export async function inspectMetaTokenValue(
  token: string
): Promise<Omit<MetaTokenHealth, "token" | "encryptedToken" | "source">> {
  try {
    const profile = await getMetaMeProfile(token)

    let expiresAt: Date | null = null
    const appAccessToken = getMetaAppAccessToken()

    if (appAccessToken) {
      try {
        const debugData = await debugMetaToken(token, appAccessToken)

        if (debugData.is_valid === false) {
          const message =
            debugData.error?.message ?? "Token META invalido ou expirado"

          return {
            ok: false,
            status: inferMetaTokenStatus(message),
            detail: message,
            expiresAt: pickNearestExpiry(
              debugData.expires_at,
              debugData.data_access_expires_at
            ),
            metaUser: null,
          }
        }

        expiresAt = pickNearestExpiry(
          debugData.expires_at,
          debugData.data_access_expires_at
        )
      } catch (error) {
        logError("meta-token.inspect.debug", error)
      }
    }

    const status = expiresAt
      ? isNearExpiry(expiresAt)
        ? "expiring_soon"
        : "active"
      : "active"
    const detail = expiresAt
      ? buildExpiryDetail(
          expiresAt,
          status === "expiring_soon" ? "Token META expira" : "Token META valido ate"
        )
      : appAccessToken
        ? "Token META ativo"
        : "Token META ativo. Configure META_APP_ID e META_APP_SECRET para rastrear a expiracao."

    return {
      ok: true,
      status,
      detail,
      expiresAt,
      metaUser: {
        id: profile.id ?? null,
        name: profile.name ?? null,
        email: profile.email ?? null,
      },
    }
  } catch (error) {
    const message =
      error instanceof MetaApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Falha ao validar token META"

    return {
      ok: false,
      status: error instanceof MetaApiError ? inferMetaTokenStatus(message) : "unknown",
      detail: message,
      expiresAt: null,
      metaUser: null,
    }
  }
}

export async function getStoredMetaTokenHealth(params: {
  storedToken: string | null
  storedExpiresAt: Date | null
  forceRemote?: boolean
}): Promise<MetaTokenHealth> {
  const { storedToken, storedExpiresAt, forceRemote = false } = params
  const candidate = resolveMetaTokenCandidate(storedToken)

  if (!candidate) {
    return {
      ok: false,
      status: "missing",
      detail: "Token META nao configurado",
      expiresAt: null,
      token: null,
      encryptedToken: null,
      source: null,
      metaUser: null,
    }
  }

  if (candidate.source === "environment") {
    if (!forceRemote) {
      return {
        ok: true,
        status: "active",
        detail: buildEnvironmentTokenDetail(),
        expiresAt: null,
        token: candidate.token,
        encryptedToken: null,
        source: "environment",
        metaUser: null,
      }
    }

    const inspected = await inspectMetaTokenValue(candidate.token)

    return {
      ...inspected,
      detail: buildEnvironmentTokenDetail(inspected.detail),
      expiresAt: inspected.expiresAt,
      token: candidate.token,
      encryptedToken: null,
      source: "environment",
    }
  }

  let token: string
  let encryptedToken: string | null

  try {
    const resolvedToken = resolveMetaToken(storedToken ?? "")
    token = resolvedToken.token
    encryptedToken = resolvedToken.encryptedToken
  } catch (error) {
    logError("meta-token.resolve", error)

    return {
      ok: false,
      status: "invalid",
      detail: getMetaTokenReadErrorDetail(error),
      expiresAt: storedExpiresAt,
      token: null,
      encryptedToken: null,
      source: "database",
      metaUser: null,
    }
  }

  if (storedExpiresAt && storedExpiresAt.getTime() <= Date.now()) {
    return {
      ok: false,
      status: "expired",
      detail: buildExpiryDetail(storedExpiresAt, "Token META expirou"),
      expiresAt: storedExpiresAt,
      token,
      encryptedToken,
      source: "database",
      metaUser: null,
    }
  }

  if (
    !forceRemote &&
    storedExpiresAt &&
    storedExpiresAt.getTime() - Date.now() > META_TOKEN_WARNING_WINDOW_MS
  ) {
    return {
      ok: true,
      status: "active",
      detail: buildExpiryDetail(storedExpiresAt, "Token META valido ate"),
      expiresAt: storedExpiresAt,
      token,
      encryptedToken,
      source: "database",
      metaUser: null,
    }
  }

  const inspected = await inspectMetaTokenValue(token)

  return {
    ...inspected,
    expiresAt: inspected.expiresAt ?? storedExpiresAt,
    token,
    encryptedToken,
    source: "database",
  }
}

async function persistMetaTokenOwnerState(params: {
  ownerId: string
  encryptedToken: string | null
  currentExpiresAt: Date | null
  nextExpiresAt: Date | null
}) {
  const { ownerId, encryptedToken, currentExpiresAt, nextExpiresAt } = params
  const shouldUpdateToken = Boolean(encryptedToken)
  const currentTime = currentExpiresAt?.getTime() ?? null
  const nextTime = nextExpiresAt?.getTime() ?? null
  const shouldUpdateExpiry = currentTime !== nextTime

  if (!shouldUpdateToken && !shouldUpdateExpiry) {
    return
  }

  try {
    await prisma.user.update({
      where: { id: ownerId },
      data: {
        ...(encryptedToken ? { metaAccessToken: encryptedToken } : {}),
        metaTokenExpiresAt: nextExpiresAt,
      },
    })
  } catch (error) {
    logError("meta-token.persist", error, { userId: ownerId })
  }
}

async function emitMetaTokenAlert(params: {
  ownerId: string
  health: MetaTokenHealth
}) {
  const { ownerId, health } = params

  if (health.status === "active" || health.status === "missing") {
    return
  }

  const severity = health.status === "expiring_soon" ? "warning" : "error"

  await recordIntegrationAlertSafely({
    severity,
    integration: "meta-token",
    source: "health-check",
    message:
      health.detail ??
      (severity === "warning"
        ? "Token META expira em breve"
        : "Falha ao validar token META armazenado"),
    dedupeKey: [
      ownerId,
      health.status,
      health.expiresAt?.toISOString() ?? "no-expiry",
    ].join(":"),
    details: {
      ownerId,
      tokenStatus: health.status,
      expiresAt: health.expiresAt,
      detail: health.detail,
      metaUser: health.metaUser,
    },
  })
}

export async function resolveMetaTokenFromOwners(
  owners: MetaTokenOwner[],
  options?: { forceRemote?: boolean }
) {
  const ownersWithTokens = owners.filter(
    (owner) =>
      typeof owner.metaAccessToken === "string" && owner.metaAccessToken.trim()
  )

  if (!ownersWithTokens.length) {
    return {
      ownerId: null,
      health: {
        ok: false,
        status: "missing" as MetaTokenStatus,
        detail: "Token META nao configurado",
        expiresAt: null,
        token: null,
        encryptedToken: null,
        source: null,
        metaUser: null,
      },
    }
  }

  let lastCheckedOwner: MetaTokenOwner | null = null
  let lastHealth: MetaTokenHealth | null = null

  for (let index = 0; index < ownersWithTokens.length; index += 1) {
    const owner = ownersWithTokens[index]
    const forceRemote = options?.forceRemote || index > 0
    const health = await getStoredMetaTokenHealth({
      storedToken: owner.metaAccessToken,
      storedExpiresAt: owner.metaTokenExpiresAt,
      forceRemote,
    })

    await persistMetaTokenOwnerState({
      ownerId: owner.id,
      encryptedToken: health.encryptedToken,
      currentExpiresAt: owner.metaTokenExpiresAt,
      nextExpiresAt:
        health.ok || health.status === "expired"
          ? health.expiresAt
          : owner.metaTokenExpiresAt,
    })
    await emitMetaTokenAlert({
      ownerId: owner.id,
      health,
    })

    if (health.ok && health.token) {
      return {
        ownerId: owner.id,
        health,
      }
    }

    lastCheckedOwner = owner
    lastHealth = health
  }

  const environmentHealth = await getStoredMetaTokenHealth({
    storedToken: null,
    storedExpiresAt: null,
    forceRemote: options?.forceRemote,
  })

  if (environmentHealth.ok && environmentHealth.token) {
    return {
      ownerId: null,
      health: environmentHealth,
    }
  }

  return {
    ownerId: lastCheckedOwner?.id ?? null,
    health:
      lastHealth ?? {
        ok: false,
        status: "unknown",
        detail: "Nao foi possivel validar nenhum token META disponivel",
        expiresAt: null,
        token: null,
        encryptedToken: null,
        source: null,
        metaUser: null,
      },
  }
}

export async function requireMetaTokenFromOwners(
  owners: MetaTokenOwner[],
  options?: { forceRemote?: boolean }
) {
  const { health } = await resolveMetaTokenFromOwners(owners, options)

  if (!health.ok || !health.token) {
    throw new Error(health.detail ?? "Token META nao configurado")
  }

  return health.token
}
