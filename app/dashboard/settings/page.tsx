"use client"

import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Plus } from "lucide-react"

type ApiResult = Record<string, unknown> | unknown[]

type SessionUser = {
  id: string
  email: string
  role: string
  name: string
}

type MetaUser = {
  id: string | null
  name: string | null
  email: string | null
}

type TokenStatus = "missing" | "active" | "expired" | "invalid" | "unknown"

type MetaAccount = {
  id: string
  name: string
  account_status: number
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

async function readApiResponse(res: Response) {
  const text = await res.text()

  if (!text) {
    return {}
  }

  try {
    return JSON.parse(text) as ApiResult
  } catch {
    return { error: text }
  }
}

function getTokenStatusLabel(status: TokenStatus) {
  switch (status) {
    case "active":
      return "Token ativo"
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

function getTokenStatusColor(status: TokenStatus) {
  switch (status) {
    case "active":
      return "bg-green-50 text-green-600"
    case "expired":
    case "invalid":
      return "bg-red-50 text-red-500"
    case "unknown":
      return "bg-yellow-50 text-yellow-700"
    default:
      return "bg-gray-100 text-gray-500"
  }
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null)
  const [savedTokenMasked, setSavedTokenMasked] = useState<string | null>(null)
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("missing")
  const [statusDetail, setStatusDetail] = useState("")

  const loadAccounts = useCallback(async () => {
    const res = await fetch("/api/settings/meta-account")
    const data = await readApiResponse(res)

    if (!res.ok) {
      if (isObject(data)) {
        throw new Error(String(data.detail ?? data.error ?? `Erro ${res.status}`))
      }

      throw new Error(`Erro ${res.status}`)
    }

    if (Array.isArray(data)) {
      setAccounts(data as MetaAccount[])
      return
    }

    setAccounts([])
  }, [])

  const loadMetaStatus = useCallback(async () => {
    setIsLoadingStatus(true)
    setErrorMsg("")

    try {
      const res = await fetch("/api/settings/meta-token", { cache: "no-store" })
      const data = await readApiResponse(res)

      if (!res.ok) {
        setResult("error")
        if (isObject(data) && isObject(data.sessionUser)) {
          setSessionUser(data.sessionUser as unknown as SessionUser)
        }
        if (isObject(data) && typeof data.tokenMasked === "string") {
          setSavedTokenMasked(data.tokenMasked)
        }
        if (
          isObject(data) &&
          (data.tokenStatus === "active"
            || data.tokenStatus === "expired"
            || data.tokenStatus === "invalid"
            || data.tokenStatus === "unknown")
        ) {
          setTokenStatus(data.tokenStatus)
        } else {
          setTokenStatus("unknown")
        }
        if (isObject(data) && typeof data.detail === "string") {
          setStatusDetail(data.detail)
        }
        if (res.status === 401) {
          setErrorMsg("Sessão expirada ou inexistente. Faça login novamente.")
          return
        }

        if (isObject(data)) {
          setErrorMsg(String(data.detail ?? data.error ?? `Erro ${res.status}`))
        } else {
          setErrorMsg(`Erro ${res.status}`)
        }
        return
      }

      if (!isObject(data)) {
        setResult(null)
        return
      }

      setSessionUser(
        isObject(data.sessionUser) ? (data.sessionUser as unknown as SessionUser) : null
      )
      setSavedTokenMasked(typeof data.tokenMasked === "string" ? data.tokenMasked : null)
      setTokenStatus(
        data.tokenStatus === "active"
          || data.tokenStatus === "expired"
          || data.tokenStatus === "invalid"
          || data.tokenStatus === "unknown"
          ? data.tokenStatus
          : "missing"
      )
      setStatusDetail(typeof data.detail === "string" ? data.detail : "")
      setMetaUser(isObject(data.metaUser) ? (data.metaUser as unknown as MetaUser) : null)

      const hasSavedToken = data.hasSavedToken === true
      if (hasSavedToken && data.tokenStatus === "active") {
        setResult("success")
        await loadAccounts()
      } else {
        setResult(null)
        setAccounts([])
      }
    } catch (error) {
      setResult("error")
      setErrorMsg(
        error instanceof Error ? error.message : "Erro ao carregar configurações"
      )
    } finally {
      setIsLoadingStatus(false)
    }
  }, [loadAccounts])

  useEffect(() => {
    void loadMetaStatus()
  }, [loadMetaStatus])

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
      const data = await readApiResponse(res)

      if (!res.ok) {
        setResult("error")
        if (res.status === 401) {
          setErrorMsg("Sessão expirada ou inexistente. Faça login novamente.")
        } else if (isObject(data)) {
          setErrorMsg(String(data.detail ?? data.error ?? `Erro ${res.status}`))
        } else {
          setErrorMsg(`Erro ${res.status}`)
        }
        return
      }

      setResult("success")
      if (isObject(data) && isObject(data.metaUser)) {
        setMetaUser(data.metaUser as unknown as MetaUser)
      }
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
        body: JSON.stringify({
          adAccountId: acc.id,
          adAccountName: acc.name,
        }),
      })
      if (res.ok || res.status === 409) {
        setImported((prev) => [...prev, acc.id])
      }
    } finally {
      setImporting(null)
    }
  }

  return (
    <>
      <Header title="Configurações" subtitle="Gerencie as integrações da plataforma" />
      <div className="p-8 max-w-4xl space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Sessão atual
            </p>
            {isLoadingStatus ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando sessão...
              </div>
            ) : sessionUser ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-gray-900">{sessionUser.name}</p>
                <p className="text-sm text-gray-500">{sessionUser.email}</p>
                <p className="text-xs text-gray-400">Perfil: {sessionUser.role}</p>
              </div>
            ) : errorMsg ? (
              <p className="text-sm text-red-500">{errorMsg}</p>
            ) : (
              <p className="text-sm text-red-500">
                Sessão não encontrada. Faça login novamente.
              </p>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Token salvo
            </p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {savedTokenMasked ?? "Nenhum token salvo"}
                </p>
                {statusDetail && <p className="text-xs text-gray-400 mt-1">{statusDetail}</p>}
              </div>
              <span
                className={`text-xs font-semibold px-3 py-1 rounded-full ${getTokenStatusColor(tokenStatus)}`}
              >
                {getTokenStatusLabel(tokenStatus)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Integração META Ads</h2>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">f</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Atualize o token da conta logada para carregar clientes e contas de anúncio da META com segurança.
          </p>
          <div className="bg-blue-50 border-l-4 border-[#C1121F] rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-blue-700">
              Acesse business.facebook.com - Configurações - Acesso à API para obter seu token pessoal.
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Novo token de acesso META
          </label>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxx..."
                className="w-full pr-10 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleValidateAndSave}
              disabled={isValidating || !token || !sessionUser}
              className="bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-5 py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
            >
              {isValidating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Validando...
                </>
              ) : savedTokenMasked ? (
                "Atualizar token"
              ) : (
                "Validar e Salvar"
              )}
            </button>
          </div>

          {result === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4" />
              {metaUser ? (
                <>
                  Token válido. Conectado como{" "}
                  <strong>{metaUser.name ?? metaUser.email ?? "usuário META"}</strong>
                </>
              ) : (
                "Token salvo com sucesso."
              )}
            </div>
          )}
          {result === "error" && (
            <div className="flex items-center gap-2 text-red-500 bg-red-50 px-4 py-3 rounded-xl text-sm">
              <XCircle className="w-4 h-4" />
              {errorMsg}
            </div>
          )}
        </div>

        {accounts.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Contas de anúncios encontradas
            </h2>
            <p className="text-sm text-gray-400 mb-6">
              {accounts.length} conta(s) vinculada(s) ao token ativo da sessão atual.
            </p>
            <div className="space-y-3">
              {accounts.map((acc) => {
                const isImported = imported.includes(acc.id)
                const isImporting = importing === acc.id
                return (
                  <div
                    key={acc.id}
                    className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                      <p className="text-xs text-gray-400">{acc.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          acc.account_status === 1
                            ? "bg-green-50 text-green-600"
                            : "bg-red-50 text-red-500"
                        }`}
                      >
                        {acc.account_status === 1 ? "Ativo" : "Inativo"}
                      </span>
                      <button
                        onClick={() => handleImport(acc)}
                        disabled={isImported || isImporting}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                          isImported
                            ? "bg-green-50 text-green-600 cursor-default"
                            : "bg-[#C1121F] hover:bg-[#A50F1A] text-white"
                        }`}
                      >
                        {isImporting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isImported ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Importado
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3" />
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
        )}
      </div>
    </>
  )
}
