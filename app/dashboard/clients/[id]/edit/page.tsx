"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { useRouter, useParams } from "next/navigation"
import { Mail, Phone, ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"

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
      .then((res) => res.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          company: data.company ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          notes: data.notes ?? "",
          whatsappGroupId: data.whatsappGroupId ?? "",
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [id])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSave() {
    if (!form.name) {
      setError("Nome completo é obrigatório.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      router.push("/dashboard/clients")
    } catch {
      setError("Erro ao salvar cliente. Tente novamente.")
    } finally {
      setIsSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#1AABDB]" />
      </div>
    )
  }

  return (
    <>
      <Header title="Editar Cliente" subtitle="Clientes / Editar" />
      <div className="p-8">
        <Link href="/dashboard/clients" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ChevronLeft className="w-4 h-4" />
          Voltar para Clientes
        </Link>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-2xl">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Informações do Cliente</h2>
          <p className="text-sm text-gray-400 mb-8">Edite os dados do cliente</p>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo *</label>
              <input name="name" value={form.name} onChange={handleChange} type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa</label>
              <input name="company" value={form.company} onChange={handleChange} type="text"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input name="email" value={form.email} onChange={handleChange} type="email"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input name="phone" value={form.phone} onChange={handleChange} type="tel"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ID Grupo WhatsApp</label>
              <input name="whatsappGroupId" value={form.whatsappGroupId} onChange={handleChange} type="text"
                placeholder="5511999999999-1234567890@g.us"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={4}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB] resize-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-8 max-w-2xl">
          <button onClick={() => router.push("/dashboard/clients")}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button onClick={handleSave} disabled={isSaving}
            className="bg-[#1AABDB] hover:bg-[#1594bf] text-white font-semibold px-6 py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2">
            {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar Alterações"}
          </button>
        </div>
      </div>
    </>
  )
}