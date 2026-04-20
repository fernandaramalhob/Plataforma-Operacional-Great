import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"
import { ensureAuthEnvironment } from "@/lib/auth-env"
import { logInfo, logWarn } from "@/lib/safe-logger"

const PUBLIC_API_PATHS = new Set([
  "/api/auth",
  "/api/auth/csrf",
  "/api/auth/error",
  "/api/auth/providers",
  "/api/auth/session",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/verify-request",
  "/api/logout",
])

const PUBLIC_API_PREFIXES = ["/api/auth/callback/", "/api/cron/"]

function isDevBypassAuthEnabled() {
  return (
    process.env.NODE_ENV !== "production"
    && process.env.DEV_BYPASS_AUTH?.trim().toLowerCase() === "true"
  )
}

function getTokenSecret() {
  return ensureAuthEnvironment().authSecret || undefined
}

function isPublicApiPath(pathname: string) {
  return (
    PUBLIC_API_PATHS.has(pathname)
    || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api") && !isPublicApiPath(pathname)
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl

  if (isDevBypassAuthEnabled()) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    return NextResponse.next()
  }

  const secret = getTokenSecret()

  if (!secret) {
    logWarn("auth.proxy.missing-secret", {
      pathname,
    })
  }

  const token = await getToken({
    req: request,
    secret,
  })

  if (pathname === "/login" && token) {
    logInfo("auth.proxy.redirect-login-to-dashboard", {
      pathname,
      hasToken: true,
    })
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname.startsWith("/dashboard") && !token) {
    const callbackUrl = `${pathname}${search}`
    const loginUrl = new URL("/login", request.url)

    if (callbackUrl && callbackUrl !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", callbackUrl)
    }

    logInfo("auth.proxy.redirect-dashboard-to-login", {
      pathname,
      callbackUrl: callbackUrl || null,
      hasToken: false,
    })

    return NextResponse.redirect(loginUrl)
  }

  if (isProtectedApiPath(pathname) && !token) {
    logInfo("auth.proxy.block-api", {
      pathname,
      hasToken: false,
    })
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/api/:path*",
  ],
}
