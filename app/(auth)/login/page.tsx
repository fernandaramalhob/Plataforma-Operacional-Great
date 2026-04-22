import LoginForm from "@/components/auth/login-form"

const DEFAULT_REDIRECT_PATH = "/dashboard"

function normalizeCallbackUrl(rawCallbackUrl: string | string[] | undefined) {
  const value = Array.isArray(rawCallbackUrl) ? rawCallbackUrl[0] : rawCallbackUrl

  if (!value) {
    return DEFAULT_REDIRECT_PATH
  }

  if (value.startsWith("/")) {
    return value
  }

  try {
    const parsed = new URL(value)

    if (parsed.origin === process.env.NEXTAUTH_URL?.replace(/\/$/, "")) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // Fall back to the dashboard below.
  }

  return DEFAULT_REDIRECT_PATH
}

type LoginPageProps = {
  searchParams?: Promise<{
    callbackUrl?: string | string[]
  }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = searchParams ? await searchParams : undefined

  return <LoginForm initialCallbackUrl={normalizeCallbackUrl(params?.callbackUrl)} />
}
