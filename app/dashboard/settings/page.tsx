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
  MetaUser,
} from "@/types/meta.types"
import type { EvolutionSettingsResponse } from "@/types/evolution.types"

const DEFAULT_META_TOKEN_SUGGESTION = "EAAxxxxxxxxxxxxxxxx..."

const META_TOKEN_SUGGESTIONS_BY_EMAIL: Record<string, string> = {
  "pedrojuan.mwdigital@gmail.com":
    "EAANXgm6L88ABRJYgIEgTZBM6XUxPtuAWilhiQHtz3sRxG896WwaiYoM57eRUe0hEt3JVjCwna1Nv4ieuD3mUCJIVrM0vmcvI0dpeZAWR5rCSus7YT6hojJQPGZCri9lCtYc8jbKmaKaEHFDl2LRNkjf55rlB2RjyKtQTPjDZC4CBpjSsibR7jYtHYHZBZAFY2H",
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
      return "Token inválido"
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
  const [tokenStatus, setTokenStatus] = useState<MetaTokenStatus>("missing")
  const [statusDetail, setStatusDetail] = useState("")
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null)
  const [isLoadingEvolution, setIsLoadingEvolution] = useState(true)
  const [evolutionData, setEvolutionData] = useState<EvolutionSettingsResponse | null>(null)
  const [evolutionError, setEvolutionError] = useState("")
  const [copiedGroupId, setCopiedGroupId] = useState("")
  const tokenSuggestion = sessionUser?.email
    ? META_TOKEN_SUGGESTIONS_BY_EMAIL[sessionUser.email] ?? DEFAULT_META_TOKEN_SUGGESTION
    : DEFAULT_META_TOKEN_SUGGESTION

  const loadAccounts = useCallback(async () => {
    const data = await fetchJsonOrThrow<MetaAccount[]>(
      "/api/settings/meta-account",
      undefined,
      "Não foi possível carregar as contas META"
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
          setErrorMsg("Sessão expirada ou inexistente. Faça login novamente.")
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
      setErrorMsg(error instanceof Error ? error.message : "Erro ao carregar configurações")
    } finally {
      setIsLoadingStatus(false)
    }
  }, [loadAccounts])

  const loadEvolutionStatus = useCallback(async () => {
    setIsLoadingEvolution(true)
    setEvolutionError("")
    try {
      const data = await fetchJsonOrThrow<EvolutionSettingsResponse>(
        "/api/settings/evolution",
        { cache: "no-store" },
        "Não foi possível carregar a Evolution"
      )
      setEvolutionData(data)
    } catch (error) {
      setEvolutionError(error instanceof Error ? error.message : "Erro ao carregar a Evolution")
      setEvolutionData(null)
    } finally {
      setIsLoadingEvolution(false)
    }
  }, [])

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
      setEvolutionError("Não foi possível copiar o ID do grupo.")
    }
  }

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
            ? "Sessão expirada ou inexistente. Faça login novamente."
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
      throw new Error(getApiErrorMessage(data, "Não foi possível importar a conta"))
    } catch (error) {
      setResult("error")
      setErrorMsg(error instanceof Error ? error.message : "Não foi possível importar a conta")
    } finally {
      setImporting(null)
    }
  }

  const overviewCard = "rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_18px_50px_-32px_rgba(15,23,42,0.35)]"

  return (
    <>
      <Header title="Configurações" subtitle="Gerencie as integrações da plataforma" />
      <div className="mx-auto max-w-[1480px] px-8 pb-10 pt-6">
        <div className="space-y-6">

          <div className="grid gap-4 md:grid-cols-2">
            <div className={overviewCard}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Sessão atual</p>
              {isLoadingStatus ? (
                <LoadingSkeleton label="Carregando sessão..." className="py-6" />
              ) : sessionUser ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-gray-900">{sessionUser.name}</p>
                  <p className="text-sm text-gray-500">{sessionUser.email}</p>
                  <p className="text-xs text-gray-400">Perfil: {sessionUser.role}</p>
                </div>
              ) : errorMsg ? (
                <ErrorState title="Sessão indisponível" message={errorMsg} />
              ) : (
                <p className="text-sm text-red-500">Sessão não encontrada. Faça login novamente.</p>
              )}
            </div>

            <div className={overviewCard}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Token salvo</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{savedTokenMasked ?? "Nenhum token salvo"}</p>
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
              <h2 className="text-lg font-bold text-gray-900">Integração META Ads</h2>
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
              Atualize o token da conta logada para carregar clientes e contas de anúncio da META com segurança.
            </p>
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-4">
              <p className="text-sm leading-6 text-blue-700">
                Acesse `business.facebook.com`, abra Configurações e localize o acesso à API para obter seu token pessoal.
              </p>
            </div>

            <MetaTokenInput
              value={token}
              showToken={showToken}
              isSubmitting={isValidating}
              disabled={!sessionUser}
              hasSavedToken={Boolean(savedTokenMasked)}
              placeholder={tokenSuggestion}
              onChange={setToken}
              onToggleVisibility={() => setShowToken((current) => !current)}
              onSubmit={() => void handleValidateAndSave()}
            />

            {result === "success" ? (
              <div className="flex items-center gap-2 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                {metaUser ? (
                  <>
                    Token válido. Conectado como <strong>{metaUser.name ?? metaUser.email ?? "usuário META"}</strong>
                  </>
                ) : (
                  "Token salvo com sucesso."
                )}
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
              <h2 className="mb-1 text-lg font-bold text-gray-900">Contas de anúncios encontradas</h2>
              <p className="mb-6 text-sm text-gray-400">
                {accounts.length} conta(s) vinculada(s) ao token ativo da sessão atual.
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
                <h2 className="text-lg font-bold text-gray-900">Conexão Evolution</h2>
                <p className="text-sm text-gray-400">
                  Consulte a instância ativa e copie o ID correto dos grupos do WhatsApp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void loadEvolutionStatus()}
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
              <LoadingSkeleton label="Carregando instância Evolution..." className="py-6" />
            ) : evolutionData ? (
              <>
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Instância</p>
                    <p className="mt-2 text-sm font-semibold text-gray-900">
                      {evolutionData.instance ?? "Não informada"}
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
                            : "Não configurada"}
                      </StatusBadge>
                      <span className="text-sm text-gray-500">{evolutionData.groups.length} grupo(s)</span>
                    </div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                    <MessageCircle className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-semibold text-gray-900">Grupos ativos na instância</p>
                  </div>
                  {evolutionData.groups.length === 0 ? (
                    <div className="px-4 py-6 text-sm text-gray-500">Nenhum grupo encontrado para esta instância.</div>
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
                              {group.size} participante(s)
                              {group.announce ? " · Somente administradores enviam" : ""}
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
