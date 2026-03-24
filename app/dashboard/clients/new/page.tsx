"use client"

import { useEffect, useMemo, useState } from "react"
import { Header } from "@/components/layout/header"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  ChevronLeft,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react"
import Link from "next/link"

type ProfileOption = {
  id: string
  name: string
}

type BrandOption = {
  id: string
  name: string
  displayName: string
  businessName: string | null
  adAccountId: string
  adAccountName: string
  accountStatus: number | null
}

export default function NewClientPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [error, setError] = useState("")
  const [metaError, setMetaError] = useState("")
  const [profileOptions, setProfileOptions] = useState<ProfileOption[]>([])
  const [brandOptions, setBrandOptions] = useState<BrandOption[]>([])

  const [form, setForm] = useState({
    profileName: "",
    brandId: "",
    email: "",
    phone: "",
    notes: "",
    whatsappGroupId: "",
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }))
  }

  function handleSelectChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }))
  }

  async function loadMetaOptions() {
    setIsLoadingMeta(true)
    setMetaError("")

    try {
      const res = await fetch("/api/clients/meta-options", {
        cache: "no-store",
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Nao foi possivel carregar as opcoes META"
        )
      }

      setProfileOptions(Array.isArray(data.profiles) ? data.profiles : [])
      setBrandOptions(Array.isArray(data.brands) ? data.brands : [])
    } catch (loadError) {
      setProfileOptions([])
      setBrandOptions([])
      setMetaError(
        loadError instanceof Error
          ? loadError.message
          : "Nao foi possivel carregar as opcoes META"
      )
    } finally {
      setIsLoadingMeta(false)
    }
  }

  useEffect(() => {
    void loadMetaOptions()
  }, [])

  const selectedBrand = useMemo(
    () => brandOptions.find((option) => option.id === form.brandId) ?? null,
    [brandOptions, form.brandId]
  )

  async function handleSave() {
    if (!form.profileName.trim()) {
      setError("Selecione o nome do perfil.")
      return
    }

    if (!selectedBrand) {
      setError("Selecione a marca ou BM do cliente.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.profileName.trim(),
          company: selectedBrand.name,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          whatsappGroupId: form.whatsappGroupId,
          adAccountId: selectedBrand.adAccountId,
          adAccountName: selectedBrand.adAccountName,
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : "Erro ao salvar cliente"
        )
      }

      router.push("/dashboard/clients")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar cliente. Tente novamente."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Header title="Novo Cliente" subtitle="Clientes / Novo Cliente" />
      <div className="p-8">
        <Link
          href="/dashboard/clients"
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Clientes / Novo Cliente
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Informacoes do cliente
            </h2>
            <p className="text-sm text-gray-400 mb-8">
              Selecione o perfil e a marca vinculada na sua integracao META.
            </p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome do perfil *
                </label>
                <input
                  name="profileName"
                  value={form.profileName}
                  onChange={handleChange}
                  type="text"
                  list="profile-options"
                  placeholder={
                    isLoadingMeta
                      ? "Carregando perfis..."
                      : "Selecione ou digite o nome do perfil"
                  }
                  disabled={isLoadingMeta}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
                <datalist id="profile-options">
                  {profileOptions.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
                <p className="text-xs text-gray-400 mt-2">
                  {profileOptions.length > 0
                    ? `${profileOptions.length} perfil(is) carregado(s) da META para facilitar a selecao.`
                    : "Se o perfil nao aparecer na lista, voce ainda pode digitar o nome manualmente."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Marca / BM *
                </label>
                <select
                  name="brandId"
                  value={form.brandId}
                  onChange={handleSelectChange}
                  disabled={isLoadingMeta || brandOptions.length === 0}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                >
                  <option value="">
                    {isLoadingMeta
                      ? "Carregando marcas..."
                      : brandOptions.length > 0
                        ? "Selecione uma marca / BM"
                        : "Nenhuma marca disponivel"}
                  </option>
                  {brandOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.displayName}
                    </option>
                  ))}
                </select>
                {selectedBrand && (
                  <div className="mt-3 rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">
                      {selectedBrand.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Conta META vinculada: {selectedBrand.adAccountName} (
                      {selectedBrand.adAccountId})
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-mail de contato
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="contato@empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Observacoes
                </label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Notas internas sobre este cliente..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] resize-none"
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Opcoes da integracao META
                </h2>
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
              </div>

              {isLoadingMeta ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Carregando perfis e marcas da META...
                </div>
              ) : metaError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
                  <div className="flex items-start gap-3 text-red-600">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{metaError}</p>
                      <p className="text-xs text-red-500">
                        Revise o token em Configuracoes e tente carregar novamente.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void loadMetaOptions()}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#C1121F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A50F1A]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          Tentar novamente
                        </button>
                        <Link
                          href="/dashboard/settings"
                          className="text-xs font-semibold text-[#C1121F] hover:underline"
                        >
                          Abrir configuracoes
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {profileOptions.length} perfil(is) disponiveis
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      A lista do campo perfil foi preenchida a partir da
                      integracao META da sua sessao atual.
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {brandOptions.length} marca(s) / conta(s) encontradas
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Ao salvar, a conta META escolhida fica vinculada ao
                      cliente para uso nos relatorios.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">WhatsApp</h2>
                <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xs font-bold">OK</span>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                ID do Grupo WhatsApp
              </label>
              <input
                name="whatsappGroupId"
                value={form.whatsappGroupId}
                onChange={handleChange}
                type="text"
                placeholder="Ex: 5511999999999-1234567890@g.us"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] mb-4"
              />
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
                Testar envio
              </button>
              <p className="text-xs text-gray-400 mt-3">
                O numero da Evolution API deve estar no grupo antes de salvar.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push("/dashboard/clients")}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button className="text-[#C1121F] text-sm font-medium hover:underline">
              Salvar e adicionar outro
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoadingMeta}
              className="bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-6 py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Cliente"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
