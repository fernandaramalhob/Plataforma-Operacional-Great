import type { Role } from "@prisma/client"

export type MetaTokenStatus =
  | "missing"
  | "active"
  | "expiring_soon"
  | "expired"
  | "invalid"
  | "unknown"

export type MetaSessionUser = {
  id: string
  email: string
  role: Role
  name: string
}

export type MetaUser = {
  id: string | null
  name: string | null
  email: string | null
}

export type MetaAccount = {
  id: string
  name: string
  account_status: number | null
}

export type MetaTokenRequest = {
  token: string
}

export type MetaTokenValidationResponse = {
  ok: boolean
  tokenStatus: MetaTokenStatus
  detail: string | null
  expiresAt: string | null
  metaUser?: MetaUser | null
}

export type MetaTokenStatusResponse = {
  sessionUser: MetaSessionUser
  hasSavedToken: boolean
  tokenStatus: MetaTokenStatus
  tokenMasked?: string | null
  metaUser?: MetaUser | null
  detail?: string | null
  expiresAt?: string | null
}

export type MetaTokenSaveResponse = {
  success: true
  tokenStatus: MetaTokenStatus
  tokenMasked: string
  metaUser: MetaUser | null
  expiresAt: string | null
  detail: string | null
}
