"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { useParams, useRouter } from "next/navigation"
import { ChevronLeft, Loader2, Mail, Phone } from "lucide-react"
import Link from "next/link"
import {
  clientPayloadSchema,
  getClientValidationMessage,
} from "@/lib/validations/client.schema"

export default function EditClientPage() {
  const router = useRouter()
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    whatsappGroupId: "",
  })

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(async (res) => {
        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string"
              ? data.error
              : "Erro ao carregar cliente"
          )
        }

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

  async function handleSave() {
    const parsedPayload = clientPayloadSchema.safeParse(form)

    if (!parsedPayload.success) {
      setError(getClientValidationMessage(parsedPayload.error))
      return
    }

    setIsSaving(true)
    setError("")

    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPayload.data),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string" ? data.error : "Erro ao salvar"
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

        <div className="max-w-2xl rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-gray-900">
            Informacoes do Cliente
          </h2>
          <p className="mb-8 text-sm text-gray-400">
            Edite os dados do cliente
          </p>

          <div className="space-y-5">
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
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  maxLength={160}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Telefone
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  type="tel"
                  maxLength={25}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Use entre 10 e 15 digitos, com ou sem mascara.
              </p>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                ID do Grupo WhatsApp
              </label>
              <input
                name="whatsappGroupId"
                value={form.whatsappGroupId}
                onChange={handleChange}
                type="text"
                maxLength={60}
                placeholder="5511999999999-1234567890@g.us"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Observacoes
              </label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={4}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>
          </div>
        </div>

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
              "Salvar Alteracoes"
            )}
          </button>
        </div>
      </div>
    </>
  )
}
