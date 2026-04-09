import { logIntegrationEvent } from "@/lib/integration-monitoring"

const META_GRAPH_API_VERSION = "v18.0"
const META_GRAPH_API_BASE_URL = `https://graph.facebook.com/${META_GRAPH_API_VERSION}`
const DEFAULT_META_API_TIMEOUT_MS = 30_000

type MetaApiErrorPayload = {
  error?: {
    message?: string
    type?: string
    code?: number
    error_subcode?: number
  }
}

export class MetaApiError extends Error {
  status: number
  code?: number
  subcode?: number
  errorType?: string

  constructor(params: {
    message: string
    status: number
    code?: number
    subcode?: number
    errorType?: string
  }) {
    super(params.message)
    this.name = "MetaApiError"
    this.status = params.status
    this.code = params.code
    this.subcode = params.subcode
    this.errorType = params.errorType
  }
}

type MetaRequestValue =
  | string
  | number
  | boolean
  | null
  | undefined

type MetaApiRequestParams = {
  path: string
  token: string
  query?: Record<string, MetaRequestValue>
}

function getMetaApiTimeoutMs() {
  const parsed = Number.parseInt(process.env.META_API_TIMEOUT_MS ?? "", 10)

  if (!Number.isFinite(parsed) || parsed < 1_000) {
    return DEFAULT_META_API_TIMEOUT_MS
  }

  return parsed
}

type MetaListResponse<T> = {
  data?: T[]
}

export type MetaApiItem = {
  id?: string
  name?: string
  account_status?: number
}

export type MetaBusiness = {
  id?: string
  name?: string
  owned_ad_accounts?: {
    data?: MetaApiItem[]
  }
  client_ad_accounts?: {
    data?: MetaApiItem[]
  }
}

export type MetaCampaign = {
  id?: string
  name?: string
  status?: string
  objective?: string
  insights?: unknown
}

export type MetaInsightRow = {
  ad_id?: string
  ad_name?: string
  age?: string
  gender?: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: unknown
  action_values?: unknown
  date_start?: string
  date_stop?: string
}

export type MetaDebugTokenData = {
  is_valid?: boolean
  expires_at?: number
  data_access_expires_at?: number
  error?: {
    message?: string
  }
}

export type MetaMeProfile = {
  id?: string
  name?: string
  email?: string
}

function buildMetaUrl(params: MetaApiRequestParams) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params.query ?? {})) {
    if (value === null || value === undefined || value === "") {
      continue
    }

    searchParams.set(key, String(value))
  }

  searchParams.set("access_token", params.token)

  const normalizedPath = params.path.startsWith("/")
    ? params.path
    : `/${params.path}`

  return `${META_GRAPH_API_BASE_URL}${normalizedPath}?${searchParams.toString()}`
}

export async function metaApiRequest<T>(
  params: MetaApiRequestParams
): Promise<T> {
  const startedAt = Date.now()
  const timeoutMs = getMetaApiTimeoutMs()
  let response: Response | null = null
  let data: (T & MetaApiErrorPayload) | null = null

  try {
    response = await fetch(buildMetaUrl(params), {
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    })
    data = (await response.json()) as T & MetaApiErrorPayload

    if (!response.ok || data.error) {
      throw new MetaApiError({
        message: data.error?.message ?? `Erro ao consultar META API (${response.status})`,
        status: response.status,
        code: data.error?.code,
        subcode: data.error?.error_subcode,
        errorType: data.error?.type,
      })
    }

    logIntegrationEvent({
      integration: "meta-graph",
      action: params.path,
      status: "success",
      durationMs: Date.now() - startedAt,
      details: {
        path: params.path,
        query: params.query,
        statusCode: response.status,
      },
    })

    return data
  } catch (error) {
    const normalizedError =
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
        ? new Error(
            `Tempo limite ao consultar a META API (${timeoutMs} ms) em ${params.path}`
          )
        : error

    logIntegrationEvent({
      integration: "meta-graph",
      action: params.path,
      status: "failure",
      durationMs: Date.now() - startedAt,
      details: {
        path: params.path,
        query: params.query,
        statusCode: response?.status ?? null,
      },
      error: normalizedError,
    })

    throw normalizedError
  }
}

export async function metaApiListRequest<T>(
  params: MetaApiRequestParams
): Promise<T[]> {
  const data = await metaApiRequest<MetaListResponse<T>>(params)
  return Array.isArray(data.data) ? data.data : []
}

export function getMetaAppAccessToken() {
  const appId =
    process.env.META_APP_ID?.trim() || process.env.FACEBOOK_APP_ID?.trim()
  const appSecret =
    process.env.META_APP_SECRET?.trim() || process.env.FACEBOOK_APP_SECRET?.trim()

  if (!appId || !appSecret) {
    return null
  }

  return `${appId}|${appSecret}`
}

export function buildMetaTimeRange(since: string, until: string) {
  return JSON.stringify({ since, until })
}

export async function getMetaMeProfile(token: string) {
  return metaApiRequest<MetaMeProfile>({
    path: "/me",
    token,
    query: {
      fields: "id,name,email",
    },
  })
}

export async function debugMetaToken(inputToken: string, appAccessToken: string) {
  const data = await metaApiRequest<{ data?: MetaDebugTokenData }>({
    path: "/debug_token",
    token: appAccessToken,
    query: {
      input_token: inputToken,
    },
  })

  return data.data ?? {}
}

export async function getMetaAdAccounts(
  token: string,
  fields = "id,name,account_status,currency,amount_spent",
  limit = 100
) {
  return metaApiListRequest<MetaApiItem>({
    path: "/me/adaccounts",
    token,
    query: {
      fields,
      limit,
    },
  })
}

export async function getMetaProfiles(token: string, limit = 100) {
  return metaApiListRequest<MetaApiItem>({
    path: "/me/accounts",
    token,
    query: {
      fields: "id,name",
      limit,
    },
  })
}

export async function getMetaBusinesses(token: string, limit = 100) {
  return metaApiListRequest<MetaBusiness>({
    path: "/me/businesses",
    token,
    query: {
      fields:
        "id,name,owned_ad_accounts.limit(100){id,name,account_status},client_ad_accounts.limit(100){id,name,account_status}",
      limit,
    },
  })
}

export async function getMetaCampaigns(params: {
  adAccountId: string
  token: string
  fields: string
  limit?: number
  timeRange?: string
  filtering?: string
}) {
  return metaApiListRequest<MetaCampaign>({
    path: `/${params.adAccountId}/campaigns`,
    token: params.token,
    query: {
      fields: params.fields,
      limit: params.limit ?? 50,
      time_range: params.timeRange,
      filtering: params.filtering,
    },
  })
}

export async function getMetaInsights(params: {
  objectId: string
  token: string
  fields: string
  timeRange?: string
  timeIncrement?: number
  limit?: number
  level?: "account" | "campaign" | "adset" | "ad"
  breakdowns?: string
}) {
  return metaApiListRequest<MetaInsightRow>({
    path: `/${params.objectId}/insights`,
    token: params.token,
    query: {
      fields: params.fields,
      time_range: params.timeRange,
      time_increment: params.timeIncrement,
      limit: params.limit,
      level: params.level,
      breakdowns: params.breakdowns,
    },
  })
}

export { META_GRAPH_API_VERSION, META_GRAPH_API_BASE_URL }
