"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import {
  CheckCircle,
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Plus,
  Shield,
  UserRound,
  Users,
  XCircle,
} from "lucide-react"

type UserRole = "ADMIN" | "MANAGER"

type UserListItem = {
  id: string
  name: string | null
  email: string
  role: UserRole
  createdAt: string
}

const initialForm = {
  name: "",
  email: "",
  password: "",
  role: "MANAGER" as UserRole,
}

function getRoleLabel(role: UserRole) {
  return role === "ADMIN" ? "Administrador" : "Gestor"
}

function getInitials(name: string | null, email: string) {
  const source = (name?.trim() || email).split(" ")
  return source
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function formatCreatedAt(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export default function UsersPage() {
  const [showForm, setShowForm] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [form, setForm] = useState(initialForm)
  const [showPassword, setShowPassword] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [usersError, setUsersError] = useState("")
  const [users, setUsers] = useState<UserListItem[]>([])

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  async function loadUsers() {
    setIsLoadingUsers(true)
    setUsersError("")

    try {
      const response = await fetch("/api/users", { cache: "no-store" })
      const data = await response.json()

      if (!response.ok) {
        setUsersError(data.error ?? "Nao foi possivel carregar os usuarios")
        setUsers([])
        return
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch {
      setUsersError("Erro ao carregar usuarios")
      setUsers([])
    } finally {
      setIsLoadingUsers(false)
    }
  }

  async function handleSubmit() {
    if (!form.name || !form.email || !form.password) {
      setError("Preencha todos os campos")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.error ?? "Nao foi possivel cadastrar o usuario")
        return
      }

      setSuccess("Usuario cadastrado com sucesso!")
      setForm(initialForm)
      setShowPassword(false)
      setShowForm(false)
      await loadUsers()
    } catch {
      setError("Erro ao cadastrar usuario")
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    void loadUsers()
  }, [])

  return (
    <div>
      <Header title="Usuarios" subtitle="Gerencie os usuarios da plataforma" />

      <div className="max-w-5xl p-8">
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowForm((current) => !current)}
            className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
          >
            <Plus className="h-4 w-4" />
            Novo Usuario
          </button>
        </div>

        {success && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-600">
            <CheckCircle className="h-4 w-4" />
            {success}
          </div>
        )}

        {showForm && (
          <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h2 className="mb-6 text-lg font-bold text-gray-900">Cadastrar Novo Usuario</h2>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
                <XCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Nome completo</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  type="text"
                  placeholder="Ex: Joao Silva"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Email</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="email@empresa.com"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Senha</label>
                <div className="relative">
                  <input
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimo 6 caracteres"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">Perfil</label>
                <select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                >
                  <option value="MANAGER">Gestor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false)
                  setError("")
                }}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </button>
            </div>
          </div>
        )}

        <div className="mb-6 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <p className="text-sm text-gray-500">
            Os usuarios cadastrados podem acessar a plataforma com email e senha.
            Apenas administradores podem cadastrar novos usuarios.
          </p>
        </div>

        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Usuarios cadastrados</h2>
              <p className="mt-1 text-sm text-gray-400">
                {users.length} {users.length === 1 ? "usuario encontrado" : "usuarios encontrados"}
              </p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF1F2] text-[#C1121F]">
              <Users className="h-5 w-5" />
            </div>
          </div>

          <div className="p-6">
            {isLoadingUsers ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando usuarios...
              </div>
            ) : usersError ? (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-500">
                {usersError}
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
                Nenhum usuario cadastrado ainda.
              </div>
            ) : (
              <div className="space-y-4">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-2xl border border-gray-100 px-4 py-4 transition hover:border-gray-200 hover:bg-gray-50/60"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#C1121F] text-sm font-semibold text-white">
                        {getInitials(user.name, user.email)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">
                          {user.name || "Sem nome"}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="h-4 w-4 shrink-0 text-gray-400" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="ml-4 flex shrink-0 items-center gap-3">
                      <div className="hidden text-right sm:block">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Cadastro</p>
                        <p className="text-sm font-medium text-gray-600">
                          {formatCreatedAt(user.createdAt)}
                        </p>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          user.role === "ADMIN"
                            ? "bg-[#FEF2F2] text-[#C1121F]"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {user.role === "ADMIN" ? (
                          <Shield className="h-3.5 w-3.5" />
                        ) : (
                          <UserRound className="h-3.5 w-3.5" />
                        )}
                        {getRoleLabel(user.role)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
