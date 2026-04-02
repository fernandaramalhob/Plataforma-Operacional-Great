"use client"

import { useEffect, useMemo, useState, type ChangeEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AlertCircle, ChevronLeft, Loader2, RefreshCw } from "lucide-react"
import { Header } from "@/components/layout/header"
import { ClientForm } from "@/components/clients/client-form"
import {
  clientPayloadSchema,
  getClientValidationMessage,
} from "@/lib/validations/client.schema"
import { fetchJsonOrThrow } from "@/lib/api-client"
import type {
  ClientMetaBrandOption,
  ClientMetaOptionsResponse,
  ClientMetaProfileOption,
} from "@/types/client.types"

export default function NewClientPage() {
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMeta, setIsLoadingMeta] = useState(true)
  const [error, setError] = useState("")
  const [metaError, setMetaError] = useState("")
  const [profileOptions, setProfileOptions] = useState<ClientMetaProfileOption[]>([])
  const [brandOptions, setBrandOptions] = useState<ClientMetaBrandOption[]>([])

  const [form, setForm] = useState({
    profileName: "",
    brandId: "",
    email: "",
    phone: "",
    notes: "",
    whatsappGroupId: "",
  })

  function handleChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setError("")
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function handleFieldValueChange(
    name: "email" | "phone" | "notes" | "whatsappGroupId",
    value: string
  ) {
    setError("")
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    setError("")
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function loadMetaOptions() {
    setIsLoadingMeta(true)
    setMetaError("")

    try {
      const data = await fetchJsonOrThrow<ClientMetaOptionsResponse>(
        "/api/clients/meta-options",
        { cache: "no-store" },
        "Não foi possível carregar as opções da META"
      )
      setProfileOptions(data.profiles)
      setBrandOptions(data.brands)
    } catch (loadError) {
      setProfileOptions([])
      setBrandOptions([])
      setMetaError(
        loadError instanceof Error
          ? loadError.message
          : "Não foi possível carregar as opções da META"
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
      setError("Selecione a marca ou a BM do cliente.")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const payload = {
        name: form.profileName.trim(),
        company: selectedBrand.name,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
        whatsappGroupId: form.whatsappGroupId,
        adAccountId: selectedBrand.adAccountId,
        adAccountName: selectedBrand.adAccountName,
      }
      const parsedPayload = clientPayloadSchema.safeParse(payload)

      if (!parsedPayload.success) {
        throw new Error(getClientValidationMessage(parsedPayload.error))
      }

      await fetchJsonOrThrow(
        "/api/clients",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedPayload.data),
        },
        "Erro ao salvar o cliente"
      )

      router.push("/dashboard/clients")
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Erro ao salvar o cliente. Tente novamente."
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Header title="Novo cliente" subtitle="Clientes / Novo cliente" />
      <div className="p-8">
        <Link
          href="/dashboard/clients"
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Clientes / Novo cliente
        </Link>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ClientForm
            title="Informações do cliente"
            description="Selecione o perfil e a marca vinculados à sua integração com a META."
            values={form}
            onChange={handleChange}
            onValueChange={handleFieldValueChange}
            leadFields={
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
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
                    maxLength={120}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <datalist id="profile-options">
                    {profileOptions.map((option) => (
                      <option key={option.id} value={option.name} />
                    ))}
                  </datalist>
                  <p className="mt-2 text-xs text-gray-400">
                    {profileOptions.length > 0
                      ? `${profileOptions.length} perfil(is) carregado(s) da META para facilitar a seleção.`
                      : "Se o perfil não aparecer na lista, você ainda pode digitar o nome manualmente."}
                  </p>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">
                    Marca / BM *
                  </label>
                  <select
                    name="brandId"
                    value={form.brandId}
                    onChange={handleSelectChange}
                    disabled={isLoadingMeta || brandOptions.length === 0}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  >
                    <option value="">
                      {isLoadingMeta
                        ? "Carregando marcas..."
                        : brandOptions.length > 0
                          ? "Selecione uma marca / BM"
                          : "Nenhuma marca disponível"}
                    </option>
                    {brandOptions.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.displayName}
                      </option>
                    ))}
                  </select>
                  {selectedBrand ? (
                    <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-gray-700">
                      <p className="font-semibold text-gray-900">
                        {selectedBrand.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Conta da META vinculada: {selectedBrand.adAccountName} (
                        {selectedBrand.adAccountId})
                      </p>
                    </div>
                  ) : null}
                </div>
              </>
            }
          />

          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">
                  Opções da integração com a META
                </h2>
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600">
                  <span className="text-sm font-bold text-white">f</span>
                </div>
              </div>

              {isLoadingMeta ? (
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando perfis e marcas da META...
                </div>
              ) : metaError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-4">
                  <div className="flex items-start gap-3 text-red-600">
                    <AlertCircle className="mt-0.5 h-4 w-4" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{metaError}</p>
                      <p className="text-xs text-red-500">
                        Revise o token em Configurações e tente carregar novamente.
                      </p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => void loadMetaOptions()}
                          className="inline-flex items-center gap-2 rounded-lg bg-[#C1121F] px-3 py-2 text-xs font-semibold text-white hover:bg-[#A50F1A]"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Tentar novamente
                        </button>
                        <Link
                          href="/dashboard/settings"
                          className="text-xs font-semibold text-[#C1121F] hover:underline"
                        >
                          Abrir configurações
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {profileOptions.length} perfil(is) disponíveis
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      A lista do campo de perfil foi preenchida com base na
                      integração META da sua sessão atual.
                    </p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900">
                      {brandOptions.length} marca(s) / conta(s) encontradas
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Ao salvar, a conta da META escolhida fica vinculada ao
                      cliente para uso nos relatórios.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/clients")}
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button className="text-sm font-medium text-[#C1121F] hover:underline">
              Salvar e adicionar outro
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || isLoadingMeta}
              className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar cliente"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
