import type { ApiErrorResponse } from "@/types/api.types"

type EmptyJsonResponse = Record<string, never>

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  return isObject(value) && typeof value.error === "string"
}

export async function readJsonResponse<T>(
  response: Response
): Promise<T | ApiErrorResponse | EmptyJsonResponse> {
  const text = await response.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as T | ApiErrorResponse
  } catch {
    return { error: text }
  }
}

export function getApiErrorMessage(
  value: unknown,
  fallbackMessage: string
): string {
  if (isApiErrorResponse(value)) {
    return value.detail ?? value.error
  }

  if (isObject(value)) {
    if (typeof value.detail === "string" && value.detail) {
      return value.detail
    }

    if (typeof value.error === "string" && value.error) {
      return value.error
    }
  }

  return fallbackMessage
}

export async function fetchJsonOrThrow<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  fallbackMessage: string
): Promise<T> {
  const response = await fetch(input, init)
  const data = await readJsonResponse<T>(response)

  if (!response.ok || isApiErrorResponse(data)) {
    throw new Error(getApiErrorMessage(data, fallbackMessage))
  }

  return data as T
}
