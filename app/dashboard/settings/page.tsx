"use client"

import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import { MetaTokenInput } from "@/components/clients/meta-token-input"
import { Header } from "@/components/layout/header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  CheckCircle,
  Copy,
  Loader2,
  MessageCircle,
  Plus,
  RefreshCw,
} from "lucide-react"
import {
  fetchJsonOrThrow,
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/api-client"
import type {
  MetaAccount,
  MetaSessionUser,
  MetaTokenSaveResponse,
  MetaTokenStatus,
  MetaTokenStatusResponse,
  MetaTokenPreset,
  MetaUser,
} from "@/types/meta.types"
import type { EvolutionSettingsResponse } from "@/types/evolution.types"

const DEFAULT_META_TOKEN_SUGGESTION = "EAAxxxxxxxxxxxxxxxx..."

const META_TOKEN_SUGGESTIONS_BY_EMAIL: Record<string, string> = {
  "pedrojuan.mwdigital@gmail.com":
    "EAANXgm6L88ABRJYgIEgTZBM6XUxPtuAWilhiQHtz3sRxG896WwaiYoM57eRUe0hEt3JVjCwna1Nv4ieuD3mUCJIVrM0vmcvI0dpeZAWR5rCSus7YT6hojJQPGZCri9lCtYc8jbKmaKaEHFDl2LRNkjf55rlB2RjyKtQTPjDZC4CBpjSsibR7jYtHYHZBZAFY2H",
}

const META_CONNECTED_NAME_BY_EMAIL: Record<string, string> = {
  "braytonmaycon5@gmail.com": "Brayton Maycon",
  "pedrojuan.mwdigital@gmail.com": "Lucas D. Oliveira",
}

const META_TOKEN_PRESET_LABELS: Record<MetaTokenPreset, string> = {
  ISAQUE: "Isaque",
  BRAYTON: "Brayton",
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isTokenStatus(value: unknown): value is MetaTokenStatus {
  return ["missing", "active", "expiring_soon", "expired", "invalid", "unknown"].includes(
    String(value)
  )
}

function getTokenStatusLabel(status: MetaTokenStatus) {
  switch (status) {
    case "active":
      return "Token ativo"
    case "expiring_soon":
      return "Expira em breve"
    case "expired":
      return "Token expirado"
    case "invalid":
      return "Token invÃ¡lido"
    case "unknown":
      return "Status indefinido"
    default:
      return "Sem token salvo"
  }
}

function getTokenStatusColor(status: MetaTokenStatus) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-600"
    case "expiring_soon":
      return "bg-yellow-50 text-yellow-700"
    case "expired":
    case "invalid":
      return "bg-red-50 text-red-500"
    case "unknown":
      return "bg-orange-50 text-orange-700"
    default:
      return "bg-gray-100 text-gray-500"
  }
}

function formatExpiry(value: string | null) {
  return value ? new Date(value).toLocaleString("pt-BR") : null
}

function readMetaUser(value: unknown) {
  return isObject(value) ? (value as MetaUser) : null
}

function readSessionUser(value: unknown) {
  return isObject(value) ? (value as MetaSessionUser) : null
}

function getConnectedMetaDisplayName(
  sessionUser: MetaSessionUser | null,
  metaUser: MetaUser | null
) {
  if (sessionUser?.email) {
    const overrideName = META_CONNECTED_NAME_BY_EMAIL[sessionUser.email]

    if (overrideName) {
      return overrideName
    }
  }

  return metaUser?.name ?? metaUser?.email ?? "usuÃƒÂ¡rio META"
}


export default function SettingsPage() {
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(true)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [metaUser, setMetaUser] = useState<MetaUser | null>(null)
  const [accounts, setAccounts] = useState<MetaAccount[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [importing, setImporting] = useState<string | null>(null)
  const [imported, setImported] = useState<string[]>([])
  const [sessionUser, setSessionUser] = useState<MetaSessionUser | null>(null)
  const [savedTokenMasked, setSavedTokenMasked] = useState<string | null>(null)
  const [selectedTokenPreset, setSelectedTokenPreset] = useState<MetaTokenPreset | null>(null)
  const [isEditingToken, setIsEditingToken] = useState(false)
  const [draftTokenPreset, setDraftTokenPreset] = useState<MetaTokenPreset | null>(null)
  const [tokenStatus, setTokenStatus] = useState<MetaTokenStatus>("missing")
  const [statusDetail, setStatusDetail] = useState("")
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null)
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(true)
  const [evolutionData, setEvolutionData] = useState<EvolutionSettingsResponse | null>(null)
  const [evolutionError, setEvolutionError] = useState("")
  const [selectedEvolutionInstance, setSelectedEvolutionInstance] = useState("")
  const [isEditingEvolutionInstance, setIsEditingEvolutionInstance] = useState(false)
  const [draftEvolutionInstance, setDraftEvolutionInstance] = useState("")
  const [isSavingEvolutionInstance, setIsSavingEvolutionInstance] = useState(false)
  const [evolutionSaveMessage, setEvolutionSaveMessage] = useState("")
  const [copiedGroupId, setCopiedGroupId] = useState("")
  const tokenSuggestion = sessionUser?.email
    ? META_TOKEN_SUGGESTIONS_BY_EMAIL[sessionUser.email] ?? DEFAULT_META_TOKEN_SUGGESTION
    : DEFAULT_META_TOKEN_SUGGESTION
  const currentTokenPreset = isEditingToken ? draftTokenPreset : selectedTokenPreset
  const currentEvolutionInstance = isEditingEvolutionInstance
    ? draftEvolutionInstance
    : selectedEvolutionInstance
  const presetButtonClass = (preset: MetaTokenPreset) =>
    `group rounded-2xl border px-4 py-3 text-left transition ${
      currentTokenPreset === preset
        ? "border-[#C1121F] bg-[#fff3f4] text-[#C1121F] shadow-sm"
        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50"
    }`

  const isPresetSelected = (preset: MetaTokenPreset) => currentTokenPreset === preset

  const beginEditingMetaToken = () => {
    setIsEditingToken(true)
    setDraftTokenPreset(selectedTokenPreset)
    setToken("")
  }

  const cancelEditingMetaToken = () => {
    setIsEditingToken(false)
    setDraftTokenPreset(selectedTokenPreset)
    setToken("")
    setErrorMsg("")
    setResult(null)
  }

  async function handleSaveMetaToken() {
    const tokenValue = token.trim()
    const presetValue = draftTokenPreset

    if (!tokenValue && !presetValue) {
      setErrorMsg("Escolha um preset ou informe um token META antes de salvar.")
      setResult("error")
      return
    }

    setIsValidating(true)
    setResult(null)
    setErrorMsg("")
    setAccounts([])

    try {
      const payload = tokenValue ? { token: tokenValue } : { preset: presetValue }
      const res = await fetch("/api/settings/meta-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await readJsonResponse<MetaTokenSaveResponse>(res)

      if (!res.ok) {
        setResult("error")
        setErrorMsg(
          res.status === 401
            ? "SessÃƒÂ£o expirada ou inexistente. FaÃƒÂ§a login novamente."
            : getApiErrorMessage(data, `Erro ${res.status}`)
        )
        return
      }

      setResult("success")
      if (isObject(data)) {
        const savedToken = data as MetaTokenSaveResponse
        setMetaUser(readMetaUser(savedToken.metaUser))
        setSavedTokenMasked(savedToken.tokenMasked)
        setSelectedTokenPreset(
          savedToken.selectedPreset === "ISAQUE" || savedToken.selectedPreset === "BRAYTON"
            ? savedToken.selectedPreset
            : null
        )
        setTokenStatus(
          isTokenStatus(savedToken.tokenStatus) ? savedToken.tokenStatus : "unknown"
        )
        setStatusDetail(typeof savedToken.detail === "string" ? savedToken.detail : "")
        setTokenExpiresAt(
          typeof savedToken.expiresAt === "string" ? savedToken.expiresAt : null
        )
      }
      setToken("")
      setDraftTokenPreset(tokenValue ? null : presetValue ?? null)
      setIsEditingToken(false)
    } catch (error) {
      setResult("error")
      setErrorMsg(error instanceof Error ? error.message : "Erro ao salvar o token da META")
    } finally {
      setIsValidating(false)
    }
  }

  const loadAccounts = useCallback(async () => {
    const data = await fetchJsonOrThrow<MetaAccount[]>(
      "/api/settings/meta-account",
      undefined,
      "NÃ£o foi possÃ­vel carregar as contas META"
    )
    setAccounts(Array.isArray(data) ? data : [])
  }, [])

  const loadMetaStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    setErrorMsg("")
    try {
      const res = await fetch("/api/settings/meta-token", { cache: "no-store" })
      const data = await readJsonResponse<MetaTokenStatusResponse>(res)
      const payload = isObject(data) ? (data as Record<string, unknown>) : {}
      if (!res.ok) {
        setResult("error")
        setSessionUser(readSessionUser(payload.sessionUser))
        setSavedTokenMasked(typeof payload.tokenMasked === "string" ? payload.tokenMasked : null)
        setTokenStatus(isTokenStatus(payload.tokenStatus) ? payload.tokenStatus : "unknown")
        setStatusDetail(typeof payload.detail === "string" ? payload.detail : "")
        setTokenExpiresAt(typeof payload.expiresAt === "string" ? payload.expiresAt : null)
        if (res.status === 401) {
          setErrorMsg("SessÃ£o expirada ou inexistente. FaÃ§a login novamente.")
          return
        }
        setErrorMsg(getApiErrorMessage(data, `Erro ${res.status}`))
        return
      }
      if (!isObject(data)) {
        setResult(null)
        return
      }
      const successPayload = data as MetaTokenStatusResponse
      setSessionUser(readSessionUser(successPayload.sessionUser))
      setSavedTokenMasked(
        typeof successPayload.tokenMasked === "string" ? successPayload.tokenMasked : null
      )
      setSelectedTokenPreset(
        successPayload.selectedPreset === "ISAQUE" || successPayload.selectedPreset === "BRAYTON"
          ? successPayload.selectedPreset
          : null
      )
      setTokenStatus(
        isTokenStatus(successPayload.tokenStatus) ? successPayload.tokenStatus : "missing"
      )
      setStatusDetail(typeof successPayload.detail === "string" ? successPayload.detail : "")
      setTokenExpiresAt(
        typeof successPayload.expiresAt === "string" ? successPayload.expiresAt : null
      )
      setMetaUser(readMetaUser(successPayload.metaUser))
      const hasSavedToken = successPayload.hasSavedToken === true
      if (
        hasSavedToken &&
        (
          successPayload.tokenStatus === "active" ||
          successPayload.tokenStatus === "expiring_soon"
        )
      ) {
        setResult("success")
        await loadAccounts()
      } else {
        setResult(null)
        setAccounts([])
      }
    } catch (error) {
      setResult("error")
      setErrorMsg(error instanceof Error ? error.message : "Erro ao carregar configuraÃ§Ãµes")
    } finally {
      setIsLoadingStatus(false)
    }
  }, [loadAccounts])

  const loadEvolutionStatus = useCallback(
    async (
      previewInstance?: string | null,
      options?: { syncDraft?: boolean; syncInstance?: boolean }
    ) => {
      setIsLoadingEvolution(true)
      setEvolutionError("")
      try {
        const query = previewInstance
          ? `?previewInstance=${encodeURIComponent(previewInstance)}`
          : ""
        const syncQuery = options?.syncInstance ? `${query ? "&" : "?"}sync=1` : ""
        const data = await fetchJsonOrThrow<EvolutionSettingsResponse>(
          `/api/settings/evolution${query}${syncQuery}`,
          { cache: "no-store" },
          "NÃ£o foi possÃ­vel carregar a Evolution"
        )
        setEvolutionData(data)
        const payload = data as EvolutionSettingsResponse
        setSelectedEvolutionInstance(payload.selectedInstance ?? "")
        if (options?.syncDraft) {
          setDraftEvolutionInstance(payload.selectedInstance ?? "")
        }
      } catch (error) {
        setEvolutionError(error instanceof Error ? error.message : "Erro ao carregar a Evolution")
        setEvolutionData(null)
        setSelectedEvolutionInstance("")
        if (options?.syncDraft) {
          setDraftEvolutionInstance("")
        }
      } finally {
        setIsLoadingEvolution(false)
      }
    },
    []
  )

  const beginEditingEvolutionInstance = () => {
    setIsEditingEvolutionInstance(true)
    setDraftEvolutionInstance(selectedEvolutionInstance)
    void loadEvolutionStatus(selectedEvolutionInstance || null, { syncDraft: false })
  }

  const cancelEditingEvolutionInstance = () => {
    setIsEditingEvolutionInstance(false)
    setDraftEvolutionInstance(selectedEvolutionInstance)
    setEvolutionSaveMessage("")
    setEvolutionError("")
    void loadEvolutionStatus(null, { syncDraft: true })
  }

  async function handleSaveEvolutionInstance() {
    setIsSavingEvolutionInstance(true)
    setEvolutionError("")
    setEvolutionSaveMessage("")

    try {
      const selectedInstance = draftEvolutionInstance.trim() || null
      const res = await fetch("/api/settings/evolution", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          selectedInstance,
        }),
      })
      const data = await readJsonResponse<EvolutionSettingsResponse>(res)

      if (!res.ok) {
        throw new Error(getApiErrorMessage(data, `Erro ${res.status}`))
      }

      const payload = data as EvolutionSettingsResponse
      setIsEditingEvolutionInstance(false)
      setSelectedEvolutionInstance(payload.selectedInstance ?? "")
      setDraftEvolutionInstance(payload.selectedInstance ?? "")
      setEvolutionSaveMessage(
        payload.selectedInstance
          ? `InstÃ¢ncia ${payload.selectedInstance} salva para esta conta.`
          : "A preferÃªncia foi removida. O envio volta para a instÃ¢ncia padrÃ£o da Evolution."
      )
      await loadEvolutionStatus(payload.selectedInstance ?? null, { syncDraft: true })
    } catch (error) {
      setEvolutionError(error instanceof Error ? error.message : "Erro ao salvar a instÃ¢ncia da Evolution")
    } finally {
      setIsSavingEvolutionInstance(false)
    }
  }

  const handleRefreshAll = useCallback(async () => {
    setResult(null)
    setErrorMsg("")
    await Promise.all([loadMetaStatus(), loadEvolutionStatus()])
  }, [loadEvolutionStatus, loadMetaStatus])

  useEffect(() => {
    void loadMetaStatus()
    void loadEvolutionStatus()
  }, [loadEvolutionStatus, loadMetaStatus])

  async function handleCopyGroupId(groupId: string) {
    try {
      await navigator.clipboard.writeText(groupId)
      setCopiedGroupId(groupId)
      window.setTimeout(() => {
        setCopiedGroupId((current) => (current === groupId ? "" : current))
      }, 2000)
    } catch {
      setEvolutionError("NÃ£o foi possÃ­vel copiar o ID do grupo.")
    }
  }

  const connectedEvolutionInstances =
    evolutionData?.instances.filter(
      (instance) => instance.status === null || instance.status === "open"
    ) ?? []

  async function handleValidateAndSave() {
    if (!token) return
    setIsValidating(true)
    setResult(null)
    setErrorMsg("")
    setAccounts([])
    try {
      const res = await fetch("/api/settings/meta-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      })
      const data = await readJsonResponse<MetaTokenSaveResponse>(res)
      if (!res.ok) {
        setResult("error")
        setErrorMsg(
          res.status === 401
            ? "SessÃ£o expirada ou inexistente. FaÃ§a login novamente."
            : getApiErrorMessage(data, `Erro ${res.status}`)
        )
        return
      }
      setResult("success")
      if (isObject(data)) setMetaUser(readMetaUser((data as MetaTokenSaveResponse).metaUser))
      setToken("")
      await loadMetaStatus()
    } catch (error) {
      setResult("error")
      setErrorMsg(error instanceof Error ? error.message : "Erro ao conectar com a META API")
    } finally {
      setIsValidating(false)
    }
  }

  async function handleImport(acc: MetaAccount) {
    setImporting(acc.id)
    try {
      const res = await fetch("/api/settings/import-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adAccountId: acc.id, adAccountName: acc.name }),
      })
      const data = await readJsonResponse<Record<string, unknown>>(res)
      if (res.ok || res.status === 409) {
        setImported((prev) => [...prev, acc.id])
        return
      }
      throw new Error(getApiErrorMessage(data, "NÃ£o foi possÃ­vel importar a conta"))
    } catch (error) {
      setResult("error")
      setErrorMsg(error instanceof Error ? error.message : "NÃ£o foi possÃ­vel importar a conta")
    } finally {
      setImporting(null)
    }
  }

  const overviewCard = "rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)]"

  return (
    <>
      <Header title="ConfiguraÃ§Ãµes" subtitle="Gerencie as integraÃ§Ãµes da plataforma" />
      <div className="mx-auto max-w-[1480px] px-8 pb-10 pt-6">
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleRefreshAll()}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar tudo
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className={overviewCard}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">SessÃ£o atual</p>
              {isLoadingStatus ? (
                <LoadingSkeleton label="Carregando sessÃ£o..." className="py-6" />
              ) : sessionUser ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{sessionUser.name}</p>
                  <p className="text-sm text-gray-500">{sessionUser.email}</p>
                  <p className="text-xs text-gray-400">Perfil: {sessionUser.role}</p>
                </div>
              ) : errorMsg ? (
                <ErrorState title="SessÃ£o indisponÃ­vel" message={errorMsg} />
              ) : (
                <p className="text-sm text-red-500">SessÃ£o nÃ£o encontrada. FaÃ§a login novamente.</p>
              )}
            </div>

            <div className={overviewCard}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Token salvo</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{savedTokenMasked ?? "Nenhum token salvo"}</p>
                  {selectedTokenPreset ? (
                    <p className="mt-1 text-xs font-medium text-[#C1121F]">
                      Preset ativo: {META_TOKEN_PRESET_LABELS[selectedTokenPreset]}
                    </p>
                  ) : null}
                  {statusDetail ? <p className="mt-1 text-xs text-gray-400">{statusDetail}</p> : null}
                  {tokenExpiresAt ? <p className="mt-1 text-xs text-gray-400">Expira em {formatExpiry(tokenExpiresAt)}</p> : null}
                </div>
                <StatusBadge className={getTokenStatusColor(tokenStatus)}>
                  {getTokenStatusLabel(tokenStatus)}
                </StatusBadge>
              </div>
            </div>
          </div>

          <div id="settings-meta" className={`${overviewCard} p-8`}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">IntegraÃ§Ã£o META Ads</h2>
              <div className="relative h-7 w-11 overflow-hidden">
                <Image
                  src="/meta-logo-blue.png"
                  alt="Meta"
                  width={1365}
                  height={768}
                  className="absolute left-0 top-1/2 h-7 w-auto max-w-none -translate-y-1/2 origin-left scale-[2.65]"
                />
              </div>
            </div>
            <p className="mb-6 text-sm text-gray-400">
              Atualize o token da conta logada para carregar clientes e contas de anÃºncio da META com seguranÃ§a.
            </p>
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <p className="text-sm leading-6 text-blue-700">
                Acesse `business.facebook.com`, abra ConfiguraÃ§Ãµes e localize o acesso Ã  API para obter seu token pessoal.
              </p>
            </div>

            <div className="mb-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Escolher token da conta</p>
                  <p className="text-xs text-gray-500">
                    {isEditingToken
                      ? "Selecione um preset ou cole um token manual e depois clique em Salvar token."
                      : "O token atual fica salvo nesta conta até você clicar em Alterar."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTokenPreset ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#C1121F] shadow-sm">
                      Token salvo: {META_TOKEN_PRESET_LABELS[selectedTokenPreset]}
                    </span>
                  ) : null}
                  {isEditingToken ? (
                    <button
                      type="button"
                      onClick={cancelEditingMetaToken}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm transition hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={beginEditingMetaToken}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                    >
                      Alterar
                    </button>
                  )}
                </div>
              </div>

              {!isEditingToken ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Preset salvo
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {selectedTokenPreset
                        ? META_TOKEN_PRESET_LABELS[selectedTokenPreset]
                        : "Nenhum preset salvo"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedTokenPreset
                        ? `Usa ${selectedTokenPreset === "ISAQUE" ? "META_ACCESS_TOKEN_ISAQUE" : "META_ACCESS_TOKEN_BRAYTON"} nesta conta.`
                        : "Clique em Alterar para definir um preset ou token manual."}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
                      Token salvo
                    </p>
                    <p className="mt-1 text-base font-semibold text-gray-900">
                      {savedTokenMasked ?? "Nenhum token salvo"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {statusDetail || "Clique em Alterar para trocar este token."}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        setDraftTokenPreset("ISAQUE")
                        setToken("")
                      }}
                      aria-pressed={isPresetSelected("ISAQUE")}
                      disabled={isValidating}
                      className={presetButtonClass("ISAQUE")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-inherit opacity-60">
                          Preset
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isPresetSelected("ISAQUE")
                              ? "bg-[#C1121F] text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isPresetSelected("ISAQUE") ? "Ativo" : "Selecionar"}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-semibold">Isaque</p>
                      <p className="mt-1 text-xs text-inherit opacity-70">
                        Usa META_ACCESS_TOKEN_ISAQUE em todas as contas desta sessão.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDraftTokenPreset("BRAYTON")
                        setToken("")
                      }}
                      aria-pressed={isPresetSelected("BRAYTON")}
                      disabled={isValidating}
                      className={presetButtonClass("BRAYTON")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-inherit opacity-60">
                          Preset
                        </p>
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            isPresetSelected("BRAYTON")
                              ? "bg-[#C1121F] text-white"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {isPresetSelected("BRAYTON") ? "Ativo" : "Selecionar"}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-semibold">Brayton</p>
                      <p className="mt-1 text-xs text-inherit opacity-70">
                        Usa META_ACCESS_TOKEN_BRAYTON em todas as contas desta sessão.
                      </p>
                    </button>
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-gray-200 bg-white/80 p-4">
                    <MetaTokenInput
                      value={token}
                      showToken={showToken}
                      isSubmitting={isValidating}
                      hasSavedToken={Boolean(savedTokenMasked)}
                      placeholder={tokenSuggestion}
                      submitLabel="Salvar token"
                      submittingLabel="Salvando..."
                      canSubmit={Boolean(token.trim() || currentTokenPreset)}
                      onChange={(value) => {
                        setToken(value)
                        if (value.trim()) {
                          setDraftTokenPreset(null)
                        }
                      }}
                      onToggleVisibility={() => setShowToken((current) => !current)}
                      onSubmit={() => void handleSaveMetaToken()}
                    />
                    <p className="-mt-2 text-xs text-gray-400">
                      O token escolhido só entra no banco quando você clicar em Salvar token.
                    </p>
                  </div>
                </>
              )}
            </div>

            {result === "success" && metaUser ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Token vÃ¡lido. Conectado como <strong>{getConnectedMetaDisplayName(sessionUser, metaUser)}</strong>
              </div>
            ) : null}

            {result === "success" && !metaUser ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                Token salvo com sucesso.
              </div>
            ) : null}

            {result === "error" ? (
              <ErrorState
                title="Falha ao validar o token"
                message={errorMsg}
                className="border-none bg-red-50 px-4 py-3 text-red-500"
              />
            ) : null}
          </div>

          {accounts.length > 0 ? (
            <div className={`${overviewCard} p-8`}>
              <h2 className="mb-1 text-lg font-bold text-gray-900">Contas de anÃºncios encontradas</h2>
              <p className="mb-6 text-sm text-gray-400">
                {accounts.length} conta(s) vinculada(s) ao token ativo da sessÃ£o atual.
              </p>
              <div className="space-y-3">
                {accounts.map((acc) => {
                  const isImported = imported.includes(acc.id)
                  const isImporting = importing === acc.id
                  return (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 transition hover:border-slate-300 hover:bg-white"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                        <p className="text-xs text-gray-400">{acc.id}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge tone={acc.account_status === 1 ? "success" : "danger"}>
                          {acc.account_status === 1 ? "Ativo" : "Inativo"}
                        </StatusBadge>
                        <button
                          onClick={() => void handleImport(acc)}
                          disabled={isImported || isImporting}
                          className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                            isImported
                              ? "cursor-default bg-green-50 text-green-600"
                              : "bg-[#C1121F] text-white hover:bg-[#A50F1A]"
                          }`}
                        >
                          {isImporting ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : isImported ? (
                            <>
                              <CheckCircle className="h-3 w-3" />
                              Importado
                            </>
                          ) : (
                            <>
                              <Plus className="h-3 w-3" />
                              Importar como cliente
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          <div id="settings-evolution" className={`${overviewCard} p-8`}>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">ConexÃ£o Evolution</h2>
                <p className="text-sm text-gray-400">
                  Consulte a instÃ¢ncia ativa e copie o ID correto dos grupos do WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadEvolutionStatus(currentEvolutionInstance || null)}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingEvolution ? "animate-spin" : ""}`} />
                Atualizar
              </button>
            </div>

            {evolutionError ? (
              <ErrorState
                title="Falha ao consultar a Evolution"
                message={evolutionError}
                className="mb-4 border-none bg-red-50 px-4 py-3 text-red-500"
              />
            ) : null}

            {isLoadingEvolution ? (
              <LoadingSkeleton label="Carregando instÃ¢ncia Evolution..." className="py-6" />
            ) : evolutionData ? (
              <>
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">InstÃ¢ncia</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {evolutionData.instance ?? "NÃ£o informada"}
                    </p>
                    {evolutionData.detail ? <p className="mt-1 text-xs text-gray-500">{evolutionData.detail}</p> : null}
                  </div>
                  <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Instancias</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {evolutionData.instances.length} conectada(s) ou detectada(s)
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {evolutionData.instances.map((instance) => instance.name).join(", ") || "Nenhuma instancia listada."}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</p>
                    <div className="mt-2 flex items-center gap-3">
                      <StatusBadge
                        className={
                          evolutionData.connected
                            ? "bg-green-50 text-green-600"
                            : evolutionData.configured
                              ? "bg-yellow-50 text-yellow-700"
                              : "bg-gray-100 text-gray-500"
                        }
                      >
                        {evolutionData.connected
                          ? "Conectada"
                          : evolutionData.configured
                            ? "Configurada"
                            : "NÃ£o configurada"}
                      </StatusBadge>
                      <span className="text-sm text-gray-500">{evolutionData.groups.length} grupo(s)</span>
                    </div>
                  </div>
                </div>

                <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-base font-bold text-gray-900">
                        Escolher número de envio dos relatórios
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {isEditingEvolutionInstance
                          ? "A instância escolhida aqui fica como rascunho até você clicar em Salvar."
                          : "A instância atual fica salva nesta conta até você clicar em Alterar."}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#C1121F] shadow-sm">
                        {currentEvolutionInstance
                          ? `Selecionada: ${currentEvolutionInstance}`
                          : "Usando instância padrão"}
                      </div>
                      {isEditingEvolutionInstance ? (
                        <button
                          type="button"
                          onClick={cancelEditingEvolutionInstance}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm transition hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={beginEditingEvolutionInstance}
                          className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50"
                        >
                          Alterar
                        </button>
                      )}
                    </div>
                  </div>

                  {!isEditingEvolutionInstance ? (
                    <div className="mt-4 grid gap-3 md:grid-cols-3">
                      <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
                          Instância salva
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-900">
                          {selectedEvolutionInstance || "Instância padrão da Evolution"}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {selectedEvolutionInstance
                            ? "Essa é a instância que será usada pelos relatórios e pelos grupos vinculados."
                            : "A plataforma usa a instância padrão até você escolher outra e salvar."}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white bg-white px-4 py-4 shadow-sm">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
                          Grupos
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-900">
                          {evolutionData.groups.length} encontrado(s)
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Os grupos abaixo vêm da instância salva.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mt-4 grid gap-3 lg:grid-cols-2">
                        {connectedEvolutionInstances.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-5 text-sm text-gray-500 lg:col-span-2">
                            Nenhuma instância conectada encontrada para selecionar.
                          </div>
                        ) : (
                          connectedEvolutionInstances.map((instance) => {
                            const isActive = currentEvolutionInstance === instance.name
                            const isPrimary = instance.isPrimary
                            const statusLabel =
                              instance.status === "open"
                                ? "Conectada"
                                : instance.status ?? "Disponível"

                            return (
                              <button
                                key={instance.name}
                                type="button"
                                onClick={() => {
                                  setDraftEvolutionInstance(instance.name)
                                  void loadEvolutionStatus(instance.name)
                                }}
                                className={`rounded-2xl border p-4 text-left transition ${
                                  isActive
                                    ? "border-[#C1121F] bg-[#fff3f4] shadow-sm"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">
                                      Instância
                                    </p>
                                    <p className="mt-1 text-base font-bold text-gray-900">
                                      {instance.name}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                        isActive
                                          ? "bg-[#C1121F] text-white"
                                          : "bg-gray-100 text-gray-500"
                                      }`}
                                    >
                                      {isActive ? "Selecionada" : "Selecionar"}
                                    </span>
                                    {isPrimary ? (
                                      <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                                        Principal
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-3">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                      instance.status === "open"
                                        ? "bg-green-50 text-green-600"
                                        : "bg-gray-100 text-gray-500"
                                    }`}
                                  >
                                    {statusLabel}
                                  </span>
                                  <span className="text-xs font-medium text-gray-400">
                                    {isActive ? "Instância em edição" : "Clique para usar"}
                                  </span>
                                </div>
                              </button>
                            )
                          })
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <p className="text-sm text-gray-500">
                          Se preferir, você pode voltar para a instância padrão da Evolution e salvar a mudança.
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button
                            type="button"
                            disabled={isSavingEvolutionInstance}
                            onClick={() => {
                              setDraftEvolutionInstance("")
                              void loadEvolutionStatus(null)
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Restaurar padrão
                          </button>
                          <button
                            type="button"
                            disabled={isSavingEvolutionInstance}
                            onClick={() => void handleSaveEvolutionInstance()}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#C1121F] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {isSavingEvolutionInstance ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Salvando...
                              </>
                            ) : (
                              "Salvar alteração"
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {evolutionSaveMessage ? (
                    <div className="mt-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                      {evolutionSaveMessage}
                    </div>
                  ) : null}
                </div>
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">Grupos ativos na instÃ¢ncia</p>
                  </div>
                  {evolutionData.groups.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">Nenhum grupo encontrado para esta instÃ¢ncia.</div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {evolutionData.groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex flex-col gap-3 px-4 py-4 transition hover:bg-slate-50/70 md:flex-row md:items-center md:justify-between"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{group.subject}</p>
                            <p className="mt-1 break-all text-xs text-gray-400">{group.id}</p>
                            <p className="mt-1 text-xs text-gray-400">
                              {group.size > 0
                                ? `${group.size} mensagem(ns) não lida(s)`
                                : "Sem mensagens não lidas"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyGroupId(group.id)}
                            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-50"
                          >
                            <Copy className="h-3.5 w-3.5" />
                            {copiedGroupId === group.id ? "Copiado" : "Copiar ID"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}






