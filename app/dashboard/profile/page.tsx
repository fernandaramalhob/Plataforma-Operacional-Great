"use client"

import { useState, useEffect, useRef } from "react"
import { Header } from "@/components/layout/header"
import { useSession, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2, CheckCircle, XCircle, LogOut, UserPlus, Pencil, Camera } from "lucide-react"

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [form, setForm] = useState({ name: "", email: "", password: "" })

  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.json())
      .then((data) => {
        setForm({ name: data.name ?? "", email: data.email ?? "", password: "" })
        if (data.avatarUrl) setAvatarPreview(data.avatarUrl)
      })
      .catch(() => {})
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setAvatarPreview(base64)
      setAvatarBase64(base64)
    }
    reader.readAsDataURL(file)
  }

  function getInitials(name: string) {
    return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
  }

  async function handleSave() {
    setIsSaving(true)
    setError("")
    setSuccess("")
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          password: form.password || undefined,
          avatarUrl: avatarBase64 || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error)
        return
      }
      await update({ name: form.name })
      setSuccess("Perfil atualizado com sucesso!")
      setIsEditing(false)
      setForm((f) => ({ ...f, password: "" }))
    } catch {
      setError("Erro ao atualizar perfil")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <Header title="Meu Perfil" subtitle="Gerencie suas informações pessoais" />
      <div className="p-8 max-w-2xl">

        {success && (
          <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl text-sm mb-6">
            <CheckCircle className="w-4 h-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-500 px-4 py-3 rounded-xl text-sm mb-6">
            <XCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 mb-4">

          {/* Avatar */}
          <div className="flex items-center gap-5 mb-8 pb-8 border-b border-gray-100">
            <div className="relative">
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#C1121F] flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">
                    {getInitials(form.name || session?.user?.name || "AD")}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-700 transition"
                >
                  <Camera className="w-3 h-3 text-white" />
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{form.name || session?.user?.name || "Admin"}</p>
              <p className="text-sm text-gray-400">{session?.user?.email}</p>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#FEF2F2] text-[#C1121F] mt-1 inline-block">
                {session?.user?.role === "ADMIN" ? "Administrador" : "Gestor"}
              </span>
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input
                name="email"
                value={form.email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-500"
              />
            </div>
            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
                <div className="relative">
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full pr-10 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 mt-8">
            {isEditing ? (
              <>
                <button onClick={() => { setIsEditing(false); setError("") }}
                  className="px-5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={isSaving}
                  className="bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60 flex items-center gap-2">
                  {isSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : "Salvar Alterações"}
                </button>
              </>
            ) : (
              <button onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                <Pencil className="w-4 h-4" />
                Editar Perfil
              </button>
            )}
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/dashboard/users")}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 hover:border-[#C1121F] hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-[#FEF2F2] flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-5 h-5 text-[#C1121F]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Gerenciar Usuários</p>
              <p className="text-xs text-gray-400">Cadastrar novos acessos</p>
            </div>
          </button>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-3 hover:border-red-200 hover:shadow-md transition text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Sair da conta</p>
              <p className="text-xs text-gray-400">Encerrar sessão atual</p>
            </div>
          </button>
        </div>

      </div>
    </div>
  )
}