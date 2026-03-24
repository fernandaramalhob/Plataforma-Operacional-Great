import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

const API_PROTECTED_PREFIXES = [
  "/api/clients",
  "/api/reports",
  "/api/settings",
  "/api/history",
]

function isProtectedApiPath(pathname: string) {
  return API_PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
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
    "/api/clients/:path*",
    "/api/reports/:path*",
    "/api/settings/:path*",
    "/api/history/:path*",
  ],
}
