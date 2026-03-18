"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, Plus } from "lucide-react"

export default function SettingsPage() {
  const [token, setToken] = useState("")
  const [showToken, setShowToken] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [result, setResult] = useState<"success" | "error" | null>(null)
  const [metaUser, setMetaUser] = useState<any>(null)
  const [accounts, setAccounts] = useState<any[]>([])
  const [errorMsg, setErrorMsg] = useState("")
  const [importing, setImporting] = useState<string | null>(null)
  const [imported, setImported] = useState<string[]>([])

  useEffect(() => {
    fetch("/api/settings/meta-account")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data)
          setResult("success")
        }
      })
      .catch(() => {})
  }, [])

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
      const data = await res.json()

      if (!res.ok) {
        setResult("error")
        setErrorMsg(data.detail ?? data.error)
        return
      }

      setResult("success")
      setMetaUser(data.metaUser)

      const accRes = await fetch("/api/settings/meta-account")
      const accData = await accRes.json()
      if (Array.isArray(accData)) setAccounts(accData)

    } catch {
      setResult("error")
      setErrorMsg("Erro ao conectar com a META API")
    } finally {
      setIsValidating(false)
    }
  }

  async function handleImport(acc: any) {
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
    } catch {
    } finally {
      setImporting(null)
    }
  }

  return (
    <>
      <Header title="Configurações" subtitle="Gerencie as integrações da plataforma" />
      <div className="p-8 max-w-3xl">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-900">Integração META Ads</h2>
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">f</span>
            </div>
          </div>
          <p className="text-sm text-gray-400 mb-6">
            Cole o seu token de acesso META. O sistema vai puxar todas as contas de anúncio vinculadas.
          </p>
          <div className="bg-blue-50 border-l-4 border-[#1AABDB] rounded-lg px-4 py-3 mb-6">
            <p className="text-sm text-blue-700">
              Acesse business.facebook.com → Configurações → Acesso à API para obter seu token pessoal.
            </p>
          </div>

          <label className="block text-sm font-medium text-gray-700 mb-1.5">Token de Acesso META</label>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <input
                type={showToken ? "text" : "password"}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxxxx..."
                className="w-full pr-10 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
              />
              <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <button
              onClick={handleValidateAndSave}
              disabled={isValidating || !token}
              className="bg-[#1AABDB] hover:bg-[#1594bf] text-white font-semibold px-5 py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2 whitespace-nowrap"
            >
              {isValidating ? <><Loader2 className="w-4 h-4 animate-spin" /> Validando...</> : "Validar e Salvar"}
            </button>
          </div>

          {result === "success" && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-4 py-3 rounded-xl text-sm">
              <CheckCircle className="w-4 h-4" />
              {metaUser ? <>Token válido! Conectado como <strong>{metaUser.name}</strong></> : "Token ativo — contas carregadas abaixo"}
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
            <h2 className="text-lg font-bold text-gray-900 mb-1">Contas de Anúncios Encontradas</h2>
            <p className="text-sm text-gray-400 mb-6">
              {accounts.length} conta(s) vinculada(s) ao seu token META. Importe as que são seus clientes.
            </p>
            <div className="space-y-3">
              {accounts.map((acc) => {
                const isImported = imported.includes(acc.id)
                const isImporting = importing === acc.id
                return (
                  <div key={acc.id} className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{acc.name}</p>
                      <p className="text-xs text-gray-400">{acc.id}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                        acc.account_status === 1 ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"
                      }`}>
                        {acc.account_status === 1 ? "Ativo" : "Inativo"}
                      </span>
                      <button
                        onClick={() => handleImport(acc)}
                        disabled={isImported || isImporting}
                        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition ${
                          isImported ? "bg-green-50 text-green-600 cursor-default" : "bg-[#1AABDB] hover:bg-[#1594bf] text-white"
                        }`}
                      >
                        {isImporting ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : isImported ? (
                          <><CheckCircle className="w-3 h-3" /> Importado</>
                        ) : (
                          <><Plus className="w-3 h-3" /> Importar como Cliente</>
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