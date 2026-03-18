"use client"

import { useState } from "react"
import { Header } from "@/components/layout/header"
import { useRouter } from "next/navigation"
import { Mail, Phone, Eye, EyeOff, ChevronLeft, Loader2 } from "lucide-react"
import Link from "next/link"

export default function NewClientPage() {
  const router = useRouter()
  const [showToken, setShowToken] = useState(false)
  const [tokenValidated, setTokenValidated] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    notes: "",
    whatsappGroupId: "",
    metaToken: "",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleValidateToken() {
    setIsValidating(true)
    await new Promise((r) => setTimeout(r, 1500))
    setTokenValidated(true)
    setIsValidating(false)
  }

  async function handleSave() {
    if (!form.name) {
      setError("Nome completo é obrigatório.")
      return
    }
    setIsSaving(true)
    setError("")
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          company: form.company,
          email: form.email,
          phone: form.phone,
          notes: form.notes,
          whatsappGroupId: form.whatsappGroupId,
        }),
      })
      if (!res.ok) throw new Error("Erro ao salvar")
      router.push("/dashboard/clients")
    } catch {
      setError("Erro ao salvar cliente. Tente novamente.")
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

          {/* Informações Básicas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Informações Básicas</h2>
            <p className="text-sm text-gray-400 mb-8">Dados principais do cliente</p>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  type="text"
                  placeholder="Ex: Ana Beatriz Santos"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Empresa / Cliente</label>
                <input
                  name="company"
                  value={form.company}
                  onChange={handleChange}
                  type="text"
                  placeholder="Ex: Loja ModaFit"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail de contato</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    type="email"
                    placeholder="contato@empresa.com.br"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    type="tel"
                    placeholder="(11) 99999-9999"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
                <textarea
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  placeholder="Notas internas sobre este cliente..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB] resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right */}
          <div className="space-y-6">

            {/* META */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Integração META Ads</h2>
                <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-bold">f</span>
                </div>
              </div>
              <div className="bg-blue-50 border-l-4 border-[#1AABDB] rounded-lg px-4 py-3 mb-6">
                <p className="text-sm text-blue-700">
                  Acesse business.facebook.com → Configurações → Acesso à API para obter seu token
                </p>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Token de Acesso META</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    name="metaToken"
                    value={form.metaToken}
                    onChange={handleChange}
                    type={showToken ? "text" : "password"}
                    placeholder="••••••••••••••••••••"
                    className="w-full pr-10 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB]"
                  />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={handleValidateToken}
                  disabled={isValidating}
                  className="bg-[#1AABDB] hover:bg-[#1594bf] text-white font-semibold px-4 py-3 rounded-xl text-sm transition disabled:opacity-60 whitespace-nowrap"
                >
                  {isValidating ? "Validando..." : tokenValidated ? "✓ Válido" : "Validar Token"}
                </button>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">WhatsApp</h2>
                <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-lg">✓</span>
                </div>
              </div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ID do Grupo WhatsApp</label>
              <input
                name="whatsappGroupId"
                value={form.whatsappGroupId}
                onChange={handleChange}
                type="text"
                placeholder="Ex: 5511999999999-1234567890@g.us"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB] mb-4"
              />
              <button className="w-full flex items-center justify-center gap-2 border border-gray-200 rounded-xl py-3 text-sm text-gray-600 hover:bg-gray-50 transition">
                ⚠ Testar Envio
              </button>
              <p className="text-xs text-gray-400 mt-3">O número Evolution API deve estar no grupo antes de salvar</p>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => router.push("/dashboard/clients")}
            className="px-6 py-3 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <div className="flex items-center gap-4">
            <button className="text-[#1AABDB] text-sm font-medium hover:underline">
              Salvar e Adicionar Outro
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#1AABDB] hover:bg-[#1594bf] text-white font-semibold px-6 py-3 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2"
            >
              {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar Cliente"}
            </button>
          </div>
        </div>

      </div>
    </>
  )
}