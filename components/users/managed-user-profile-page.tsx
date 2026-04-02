"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useEffectEvent, useRef, useState } from "react"
import {
  ArrowLeft,
  Camera,
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Shield,
  UserRound,
  XCircle,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { readJsonResponse, getApiErrorMessage, fetchJsonOrThrow } from "@/lib/api-client"
import type {
  ProfileResponse,
  UpdateProfileRequest,
  UpdateProfileResponse,
} from "@/types/api.types"

type ManagedUserProfilePageProps = {
  userId: string
}

type ProfileForm = {
  name: string
  email: string
  password: string
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((segment) => segment[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ManagedUserProfilePage({
  userId,
}: ManagedUserProfilePageProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarBase64, setAvatarBase64] = useState<string | null>(null)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [form, setForm] = useState<ProfileForm>({
    name: "",
    email: "",
    password: "",
  })

  const loadProfile = useEffectEvent(async () => {
    setIsLoading(true)
    setError("")

    try {
      const data = await fetchJsonOrThrow<ProfileResponse>(
        `/api/users/${userId}`,
        { cache: "no-store" },
        "Erro ao carregar perfil do gestor"
      )

      setProfile(data)
      setForm({
        name: data.name,
        email: data.email,
        password: "",
      })
      setAvatarPreview(data.avatarUrl)
      setAvatarBase64(null)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Erro ao carregar perfil do gestor"
      )
    } finally {
      setIsLoading(false)
    }
  })

  useEffect(() => {
    void loadProfile()
  }, [userId])

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const base64 = reader.result as string
      setAvatarPreview(base64)
      setAvatarBase64(base64)
    }
    reader.readAsDataURL(file)
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

      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await readJsonResponse<UpdateProfileResponse>(response)

      if (!response.ok) {
        setError(getApiErrorMessage(data, "Erro ao atualizar perfil do gestor"))
        return
      }

      const updatedProfile = data as UpdateProfileResponse
      setProfile(updatedProfile.user)
      setAvatarPreview(updatedProfile.user.avatarUrl)
      setSuccess("Perfil do gestor atualizado com sucesso!")
      setIsEditing(false)
      setForm((current) => ({
        ...current,
        name: updatedProfile.user.name,
        email: updatedProfile.user.email,
        password: "",
      }))
    } catch {
      setError("Erro ao atualizar perfil do gestor")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <Header title="Perfil do Gestor" subtitle="Carregando dados do gestor" />
        <LoadingSkeleton label="Carregando perfil do gestor..." />
      </div>
    )
  }

  if (!profile) {
    return (
      <div>
        <Header title="Perfil do Gestor" subtitle="Acesso administrativo" />
        <div className="max-w-2xl p-8">
          <ErrorState
            title="Não foi possível abrir o perfil"
            message={error || "Gestor não encontrado."}
            action={
              <Link
                href="/dashboard/users"
                className="inline-flex rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Voltar para usuários
              </Link>
            }
          />
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Perfil do Gestor" subtitle="Acesso administrativo ao perfil da equipe" />
      <div className="max-w-2xl p-8">
        <div className="mb-6">
          <Link
            href="/dashboard/users"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-[#C1121F] hover:text-[#C1121F]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar para usuários
          </Link>
        </div>

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

        <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-5 border-b border-gray-100 pb-8">
            <div className="relative">
              {avatarPreview ? (
                <Image
                  src={avatarPreview}
                  alt="Avatar do gestor"
                  width={80}
                  height={80}
                  unoptimized
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#C1121F]">
                  <span className="text-2xl font-bold text-white">
                    {getInitials(form.name || profile.name || "GT")}
                  </span>
                </div>
              )}

              {isEditing ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 transition hover:bg-gray-700"
                >
                  <Camera className="h-3 w-3 text-white" />
                </button>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </div>

            <div>
              <p className="text-xl font-bold text-gray-900">{form.name || profile.name}</p>
              <p className="text-sm text-gray-400">{profile.email}</p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-[#FEF2F2] px-2.5 py-1 text-xs font-semibold text-[#C1121F]">
                {profile.role === "ADMIN" ? (
                  <Shield className="h-3.5 w-3.5" />
                ) : (
                  <UserRound className="h-3.5 w-3.5" />
                )}
                {profile.role === "ADMIN" ? "Administrador" : "Gestor"}
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

            {isEditing ? (
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
                    placeholder="Deixe em branco para manter a senha atual"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
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
            ) : null}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setError("")
                    setAvatarPreview(profile.avatarUrl)
                    setAvatarBase64(null)
                    setForm({
                      name: profile.name,
                      email: profile.email,
                      password: "",
                    })
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
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Salvando...
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
      </div>
    </div>
  )
}
