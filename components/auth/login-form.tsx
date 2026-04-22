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

type LoginFormData = z.infer<typeof loginSchema>

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

    if (typeof window !== "undefined" && parsed.origin === window.location.origin) {
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
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginFormData) {
    let shouldResetLoading = true

    setIsLoading(true)
    setError("")

    try {
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

      if (!session?.user?.email) {
        throw new Error(
          "A autenticação foi concluída, mas a sessão não ficou disponível. Verifique NEXTAUTH_URL e NEXTAUTH_SECRET na Vercel."
        )
      }

      const destination = normalizeCallbackUrl(result.url ?? callbackUrl)
      shouldResetLoading = false
      window.location.assign(destination)
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Ocorreu um erro inesperado ao entrar."

      setError(message)
    } finally {
      if (shouldResetLoading) {
        setIsLoading(false)
      }
    }
  }

  const featureCards = [
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
  ]

  return (
    <main className="relative isolate min-h-screen overflow-hidden bg-[#f4f5f8] px-4 py-4 text-slate-900 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(193,18,31,0.08),transparent_34%),radial-gradient(circle_at_top_right,rgba(99,102,241,0.07),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_30%)]" />

      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1720px] gap-6 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="relative overflow-hidden rounded-[44px] bg-[linear-gradient(145deg,#080c18_0%,#121a2d_52%,#20263f_100%)] px-8 py-8 text-white shadow-[0_32px_80px_-36px_rgba(15,23,42,0.72)] sm:px-10 sm:py-10 lg:px-12 lg:py-12">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.07),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(193,18,31,0.18),transparent_26%)]" />

          <div className="relative flex h-full min-h-[calc(100vh-4rem)] flex-col justify-between gap-8">
            <div className="space-y-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-[0.82rem] font-semibold uppercase tracking-[0.22em] text-white/80">
                <Sparkles className="h-4 w-4 text-[#f4b6be]" />
                GreatGo
              </div>

              <div className="max-w-3xl space-y-6">
                <p className="text-sm font-semibold uppercase tracking-[0.42em] text-white/45">
                  Operação comercial
                </p>
                <h1 className="max-w-3xl text-[clamp(3.2rem,5.8vw,6.4rem)] font-semibold leading-[0.9] tracking-[-0.06em] text-white">
                  Um painel mais claro para acompanhar clientes, mídia e relatórios.
                </h1>
                <p className="max-w-2xl text-[1.15rem] leading-8 text-white/70">
                  A interface foi redesenhada para parecer mais atual, com contraste mais forte,
                  profundidade e foco no que importa: entrar rápido, operar rápido e visualizar
                  tudo sem ruído.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {featureCards.map(({ icon: Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-[28px] border border-white/10 bg-white/[0.06] px-5 py-5 backdrop-blur-sm"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-white">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-white/40">
                        {label}
                      </p>
                      <p className="mt-2 text-[1.02rem] font-medium leading-6 text-white/80">
                        {value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[30px] border border-white/10 bg-white/[0.08] px-6 py-5">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.26em] text-white/40">
                  Plataforma
                </p>
                <p className="mt-3 max-w-md text-[1.08rem] font-semibold leading-7 text-white">
                  Gestão, relatórios e operação em um só lugar.
                </p>
              </div>
              <div className="rounded-[30px] border border-white/10 bg-white/[0.08] px-6 py-5">
                <p className="text-[0.76rem] font-semibold uppercase tracking-[0.26em] text-white/40">
                  Status
                </p>
                <div className="mt-3 flex items-center gap-3 text-[1.02rem] font-semibold text-white">
                  <div className="h-3.5 w-3.5 rounded-full bg-emerald-400 shadow-[0_0_0_8px_rgba(74,222,128,0.14)]" />
                  Ambiente pronto para acesso de equipe
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-stretch">
          <div className="relative flex w-full flex-col justify-center rounded-[44px] border border-[#d9e0ec] bg-[linear-gradient(180deg,#ffffff_0%,#ffffff_56%,#fefefe_100%)] px-6 py-6 shadow-[0_28px_90px_-52px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div className="space-y-3">
                <p className="inline-flex items-center gap-2 rounded-full border border-[#dbe2ef] bg-[#fbfcfe] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.26em] text-[#5f6f8f]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#C1121F]" />
                  Acesso interno
                </p>
                <div>
                  <h2 className="max-w-xl text-[clamp(2.8rem,4.4vw,5rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-slate-900">
                    Entrar na plataforma
                  </h2>
                  <p className="mt-4 max-w-xl text-[1.1rem] leading-8 text-slate-500">
                    Use sua conta cadastrada para acessar o painel operacional, clientes e
                    integrações.
                  </p>
                </div>
              </div>

              <div className="hidden rounded-[28px] border border-[#dbe2ef] bg-[#f8fafc] px-6 py-5 text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#91a0bb]">
                  Ambiente
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-800">
                  GreatGo
                  <br />
                  internal
                </p>
              </div>
            </div>

            {error ? (
              <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-[0_14px_30px_-24px_rgba(193,18,31,0.55)]">
                {error}
              </div>
            ) : null}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="seuemail@empresa.com"
                    className="w-full rounded-2xl border border-[#d9e0ec] bg-white py-3.5 pl-11 pr-4 text-[0.98rem] text-slate-900 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.3)] transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                </div>
                {errors.email ? (
                  <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="********"
                    className="w-full rounded-2xl border border-[#d9e0ec] bg-white py-3.5 pl-11 pr-12 text-[0.98rem] text-slate-900 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.3)] transition placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#C1121F] px-4 py-4 text-[1.05rem] font-semibold text-white shadow-[0_18px_36px_-22px_rgba(193,18,31,0.72)] transition hover:bg-[#a50f1a] disabled:cursor-not-allowed disabled:opacity-60"
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

            <div className="mt-8 grid gap-3 border-t border-[#dbe2ef] pt-6 sm:grid-cols-3">
              <div className="rounded-2xl bg-[#f7f9fc] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#91a0bb]">
                  Segurança
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Sessão com NextAuth e token JWT
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f9fc] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#91a0bb]">
                  Acesso
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Perfis admin e gestor centralizados
                </p>
              </div>
              <div className="rounded-2xl bg-[#f7f9fc] px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#91a0bb]">
                  Experiência
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
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
