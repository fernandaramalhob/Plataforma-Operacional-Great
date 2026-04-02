"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { ClientForm } from "@/components/clients/client-form"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import {
  clientPayloadSchema,
  getClientValidationMessage,
} from "@/lib/validations/client.schema"
import { fetchJsonOrThrow } from "@/lib/api-client"
import type { ClientDetail, ClientFormValues } from "@/types/client.types"

export default function EditClientPage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState<ClientFormValues>({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    whatsappGroupId: "",
  })

  useEffect(() => {
    void fetchJsonOrThrow<ClientDetail>(
      `/api/clients/${id}`,
      undefined,
      "Erro ao carregar cliente"
    )
      .then((data) => {
        setForm({
          name: data.name ?? "",
          company: data.company ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          notes: data.notes ?? "",
          whatsappGroupId: data.whatsappGroupId ?? "",
        })
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Erro ao carregar cliente"
        )
      })
      .finally(() => setLoading(false))
  }, [id])

  function handleChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setError("")
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleFieldValueChange(
    name: "email" | "phone" | "notes" | "whatsappGroupId",
    value: string
  ) {
    setError("")
    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSave() {
    const parsedPayload = clientPayloadSchema.safeParse(form)

    if (!parsedPayload.success) {
      setError(getClientValidationMessage(parsedPayload.error))
      return
    }

    setIsSaving(true)
    setError("")

    try {
      await fetchJsonOrThrow(
        `/api/clients/${id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsedPayload.data),
        },
        "Erro ao salvar"
      )

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    )
  }

  if (
    error &&
    !form.name &&
    !form.company &&
    !form.email &&
    !form.phone &&
    !form.notes &&
    !form.whatsappGroupId
  ) {
    return (
      <>
        <Header title="Editar Cliente" subtitle="Clientes / Editar" />
        <div className="p-8">
          <Link
            href="/dashboard/clients"
            className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Clientes
          </Link>
          <div className="max-w-2xl rounded-2xl border border-gray-100 bg-white p-6 text-sm text-red-500 shadow-sm">
            {error}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Editar Cliente" subtitle="Clientes / Editar" />
      <div className="p-8">
        <Link
          href="/dashboard/clients"
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Clientes
        </Link>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <ClientForm
          title="Informações do Cliente"
          description="Edite os dados do cliente."
          values={form}
          onChange={handleChange}
          onValueChange={handleFieldValueChange}
          leadFields={
            <>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nome completo *
                </label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  type="text"
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Empresa
                </label>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  type="text"
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>
            </>
          }
        />

        <div className="mt-8 flex max-w-2xl items-center justify-between">
          <button
            onClick={() => router.push("/dashboard/clients")}
            className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </button>
        </div>
      </div>
    </>
  )
}
