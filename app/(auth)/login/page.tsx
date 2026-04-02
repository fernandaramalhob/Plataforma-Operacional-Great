"use client"

import Image from "next/image"
import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react"
import { ThemeToggle } from "@/components/theme/theme-toggle"
import { loginSchema } from "@/lib/validations/auth.schema"

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setIsLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    })

    if (result?.error) {
      setError("E-mail ou senha inválidos")
      setIsLoading(false)
      return
    }

    router.push("/dashboard")
  }

  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-app-background)" }}
    >
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-[480px] rounded-2xl bg-white px-10 py-10 shadow-sm">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="Logo GreatGo"
            width={64}
            height={64}
            className="mb-4 h-16 w-16 object-contain"
            priority
          />
          <h1 className="text-2xl font-bold text-gray-900">GreatGo</h1>
          <p className="mt-1 text-sm text-gray-400">
            Operação de relatórios para META Ads
          </p>
          <p
            className="mt-3 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: "var(--color-primary-soft)",
              color: "var(--color-primary)",
            }}
          >
            Acesso para usuários cadastrados
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
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
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
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
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-10 text-sm text-gray-900 transition placeholder:text-gray-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-[#C1121F] py-3.5 font-semibold text-white transition hover:bg-[#A50F1A] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando...
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </main>
  )
}
