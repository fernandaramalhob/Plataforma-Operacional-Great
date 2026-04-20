"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  Camera,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  LogOut,
  Pencil,
  UserPlus,
  XCircle,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import {
  fetchJsonOrThrow,
  getApiErrorMessage,
  readJsonResponse,
} from "@/lib/api-client"
import type {
  ProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@/types/api.types"

type ProfileForm = {
  name: string
  email: string
  password: string
}

export default function ProfilePage() {
  const { data: session, update } = useSession()
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [form, setForm] = useState<ProfileForm>({ name: "", email: "", password: "" })

  useEffect(() => {
    void fetchJsonOrThrow<ProfileResponse>(
      "/api/profile",
      undefined,
      "Erro ao carregar perfil"
    )
      .then((data) => {
        setForm({ name: data.name, email: data.email, password: "" })
        if (data.avatarUrl) {
          setAvatarPreview(data.avatarUrl)
        }
      })
      .catch(() => {
        setError("Erro ao carregar perfil")
      })
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
    return name
      .split(" ")
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  async function handleSignOut() {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)

    try {
      await signOut({
        callbackUrl: "/login",
        redirect: true,
      })
    } finally {
      setIsSigningOut(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const payload: UpdateProfileRequest = {
        name: form.name || undefined,
        password: form.password || undefined,
        avatarUrl: avatarBase64 || undefined,
      }

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await readJsonResponse<UpdateProfileResponse>(res)

      if (!res.ok) {
        setError(getApiErrorMessage(data, "Erro ao atualizar perfil"))
        return
      }

      const updatedProfile = data as UpdateProfileResponse

      setAvatarPreview(updatedProfile.user.avatarUrl)
      await update({ name: updatedProfile.user.name })
      setSuccess("Perfil atualizado com sucesso!")
      setIsEditing(false)
      setForm((current) => ({ ...current, password: "" }))
    } catch {
      setError("Erro ao atualizar perfil")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div>
      <Header title="Meu Perfil" subtitle="Gerencie suas informações pessoais" />
      <div className="max-w-2xl p-8">
        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
            <XCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-5 border-b border-gray-100 pb-8">
            <div className="relative">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C1121F]">
                  <span className="text-2xl font-bold text-white">
                    {getInitials(form.name || session?.user?.name || "AD")}
                  </span>
                </div>
              )}
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 transition hover:bg-gray-700"
                >
                  <Camera className="h-3 w-3 text-white" />
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
              <p className="text-xl font-bold text-gray-900">
                {form.name || session?.user?.name || "Admin"}
              </p>
              <p className="text-sm text-gray-400">{session?.user?.email}</p>
              <span className="mt-1 inline-block rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#C1121F]">
                {session?.user?.role === "ADMIN" ? "Administrador" : "Gestor"}
              </span>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                Nome completo
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
              <input
                name="email"
                value={form.email}
                disabled
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500"
              />
            </div>
            {isEditing && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    placeholder="Deixe em branco para não alterar"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setError("")
                  }}
                  className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    "Salvar Alterações"
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
              >
                <Pencil className="h-4 w-4" />
                Editar Perfil
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/dashboard/users")}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-[#C1121F] hover:shadow-md"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FEF2F2]">
              <UserPlus className="h-5 w-5 text-[#C1121F]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">Gerenciar Usuários</p>
              <p className="text-xs text-gray-400">Cadastrar novos acessos</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => void handleSignOut()}
            disabled={isSigningOut}
            className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-5 text-left shadow-sm transition hover:border-red-200 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50">
              <LogOut className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {isSigningOut ? "Saindo..." : "Sair da conta"}
              </p>
              <p className="text-xs text-gray-400">Encerrar sessão atual e trocar de conta</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
