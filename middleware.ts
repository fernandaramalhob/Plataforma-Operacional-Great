import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const PUBLIC_API_PATHS = new Set([
  "/api/auth",
  "/api/auth/csrf",
  "/api/auth/error",
  "/api/auth/providers",
  "/api/auth/session",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/verify-request",
])

const PUBLIC_API_PREFIXES = ["/api/auth/callback/"]

function isPublicApiPath(pathname: string) {
  return (
    PUBLIC_API_PATHS.has(pathname)
    || PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
  )
}

function isProtectedApiPath(pathname: string) {
  return pathname.startsWith("/api") && !isPublicApiPath(pathname)
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  })

  if (pathname === "/login" && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (pathname.startsWith("/dashboard") && !token) {
    const callbackUrl = `${pathname}${search}`
    const loginUrl = new URL("/login", request.url)

    if (callbackUrl && callbackUrl !== "/dashboard") {
      loginUrl.searchParams.set("callbackUrl", callbackUrl)
    }

    return NextResponse.redirect(loginUrl)
  }

  if (isProtectedApiPath(pathname) && !token) {
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
