"use client"

import Image from "next/image"
import { useState } from "react"
import { getSession, signIn } from "next-auth/react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  ArrowRight,
  BarChart3,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { withTimeout } from "@/lib/async"
import { loginSchema } from "@/lib/validations/auth.schema"

type LoginForm = z.infer<typeof loginSchema>

const DEFAULT_REDIRECT_PATH = "/dashboard"

function normalizeCallbackUrl(rawCallbackUrl: string) {
  if (!rawCallbackUrl) {
    return DEFAULT_REDIRECT_PATH
  }

  if (rawCallbackUrl.startsWith("/")) {
    return rawCallbackUrl
  }

  try {
    const parsed = new URL(rawCallbackUrl)

    if (
      typeof window !== "undefined"
      && parsed.origin === window.location.origin
    ) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    console.warn("[auth/login] callbackUrl inválida", { rawCallbackUrl })
  }

  return DEFAULT_REDIRECT_PATH
}

function getLoginErrorMessage(error: string | undefined) {
  if (!error) {
    return "Não foi possível concluir o login."
  }

  if (error === "CredentialsSignin") {
    return "E-mail ou senha inválidos."
  }

  if (error === "AccessDenied") {
    return "Seu acesso foi recusado. Verifique suas permissões."
  }

  return "Não foi possível entrar agora. Tente novamente em instantes."
}

type LoginFormProps = {
  initialCallbackUrl: string
}

export default function LoginForm({ initialCallbackUrl }: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const callbackUrl = normalizeCallbackUrl(initialCallbackUrl)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    let shouldResetLoading = true

    console.info("[auth/login] submit.clicked", {
      callbackUrl,
    })

    setIsLoading(true)
    setError("")

    try {
      console.info("[auth/login] submit.started")

      const result = await withTimeout(
        signIn("credentials", {
          email: data.email,
          password: data.password,
          redirect: false,
          callbackUrl,
        }),
        15_000,
        "A autenticação demorou mais do que o esperado. Tente novamente."
      )

      console.info("[auth/login] sign-in.response", {
        ok: result?.ok ?? false,
        status: result?.status ?? null,
        error: result?.error ?? null,
        url: result?.url ?? null,
      })

      if (!result) {
        throw new Error("Não houve resposta da autenticação.")
      }

      if (result.error) {
        setError(getLoginErrorMessage(result.error))
        return
      }

      const session = await withTimeout(
        getSession(),
        5_000,
        "O login foi aceito, mas a sessão não ficou disponível a tempo."
      )

      console.info("[auth/login] session.checked", {
        hasUser: Boolean(session?.user?.email),
        userId: session?.user?.id ?? null,
        role: session?.user?.role ?? null,
      })

      if (!session?.user?.email) {
        throw new Error(
          "A autenticação foi concluída, mas a sessão não ficou disponível. Verifique NEXTAUTH_URL e NEXTAUTH_SECRET na Vercel."
        )
      }

      const destination = normalizeCallbackUrl(result.url ?? callbackUrl)
      console.info("[auth/login] redirect.started", {
        destination,
      })

      shouldResetLoading = false
      window.location.assign(destination)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Ocorreu um erro inesperado ao entrar."

      console.error("[auth/login] submit.failed", {
        message,
      })
      setError(message)
    } finally {
      if (shouldResetLoading) {
        console.info("[auth/login] submit.finished-without-redirect")
        setIsLoading(false)
      }
    }
  }

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[var(--color-app-background)] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-[26rem] w-[26rem] rounded-full bg-[rgba(193,18,31,0.14)] blur-3xl" />
      <div className="pointer-events-none absolute right-[-8rem] top-[18%] h-[24rem] w-[24rem] rounded-full bg-[rgba(59,130,246,0.12)] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-10rem] left-[22%] h-[22rem] w-[22rem] rounded-full bg-[rgba(15,23,42,0.08)] blur-3xl" />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-stretch gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative overflow-hidden rounded-[34px] border border-white/10 bg-[linear-gradient(145deg,rgba(8,11,18,0.98)_0%,rgba(15,23,42,0.96)_46%,rgba(30,41,59,0.92)_100%)] p-8 text-white shadow-[0_32px_90px_-48px_rgba(15,23,42,0.8)] sm:p-10">
          <div className="pointer-events-none absolute -right-16 top-10 h-44 w-44 rounded-full bg-[rgba(193,18,31,0.18)] blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[rgba(59,130,246,0.12)] blur-3xl" />

          <div className="relative flex h-full flex-col justify-between gap-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/70">
                <Sparkles className="h-3.5 w-3.5 text-[#f1b5ba]" />
                GreatGo
              </div>

              <div className="max-w-xl space-y-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.32em] text-white/40">
                  Operação comercial
                </p>
                <h1 className="text-4xl font-semibold leading-tight tracking-[-0.04em] sm:text-5xl">
                  Um painel mais claro para acompanhar clientes, mídia e relatórios.
                </h1>
                <p className="max-w-lg text-base leading-7 text-white/70 sm:text-lg">
                  A interface foi redesenhada para parecer mais atual, com contraste mais forte,
                  profundidade e foco no que importa: entrar rápido, operar rápido e visualizar
                  tudo sem ruído.
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: BarChart3,
                  label: "Visão operacional",
                  value: "Métricas em destaque",
                },
                {
                  icon: ShieldCheck,
                  label: "Acesso protegido",
                  value: "Login e sessão seguros",
                },
                {
                  icon: Clock3,
                  label: "Fluxo rápido",
                  value: "Entrada sem atrito",
                },
              ].map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-3xl border border-white/10 bg-white/[0.06] px-4 py-4 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-medium text-white/80">{value}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[28px] border border-white/10 bg-white/[0.08] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Plataforma
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Gestão, relatórios e operação em um só lugar.
                </p>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-white/[0.08] px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/40">
                  Status
                </p>
                <div className="mt-2 flex items-center gap-2 text-sm font-medium text-white/80">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_0_6px_rgba(74,222,128,0.12)]" />
                  Ambiente pronto para acesso de equipe
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-stretch">
          <div className="relative flex w-full flex-col justify-center rounded-[34px] border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-elevated)] p-6 shadow-[0_28px_80px_-52px_rgba(15,23,42,0.62)] backdrop-blur-xl sm:p-8">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-muted)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-soft)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                  Acesso interno
                </p>
                <div>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[color:var(--color-app-text)] sm:text-4xl">
                    Entrar na plataforma
                  </h2>
                  <p className="mt-3 max-w-lg text-sm leading-6 text-[color:var(--color-app-text-soft)] sm:text-base">
                    Use sua conta cadastrada para acessar o painel operacional, clientes e
                    integrações.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-[28px] border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-muted)] px-4 py-3 text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
                  Ambiente
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--color-app-text)]">
                  GreatGo internal
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-[0_14px_30px_-24px_rgba(193,18,31,0.55)]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  E-mail
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="seuemail@empresa.com"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-10 pr-4 text-sm text-gray-900 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.35)] transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="w-full rounded-2xl border border-gray-200 bg-white py-3.5 pl-10 pr-10 text-sm text-gray-900 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.35)] transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C1121F] px-4 py-3.5 font-semibold text-white shadow-[0_18px_30px_-22px_rgba(193,18,31,0.7)] transition hover:bg-[#A50F1A] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 grid gap-3 border-t border-[color:var(--color-app-border)] pt-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-[var(--color-app-surface-muted)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
                  Segurança
                </p>
                <p className="mt-2 text-sm text-[color:var(--color-app-text-muted)]">
                  Sessão com NextAuth e token JWT
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-app-surface-muted)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
                  Acesso
                </p>
                <p className="mt-2 text-sm text-[color:var(--color-app-text-muted)]">
                  Perfis admin e gestor centralizados
                </p>
              </div>
              <div className="rounded-2xl bg-[var(--color-app-surface-muted)] px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
                  Experiência
                </p>
                <p className="mt-2 text-sm text-[color:var(--color-app-text-muted)]">
                  Interface atualizada com foco na operação
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
