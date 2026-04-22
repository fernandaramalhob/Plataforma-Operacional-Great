import { NextResponse } from "next/server"

const LOGOUT_COOKIE_NAMES = [
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.session-token",
  "next-auth.csrf-token",
  "__Secure-next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "__Host-next-auth.callback-url",
  "next-auth.pkce.code_verifier",
  "__Secure-next-auth.pkce.code_verifier",
  "__Host-next-auth.pkce.code_verifier",
]

function buildLogoutResponse(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url))

  for (const name of LOGOUT_COOKIE_NAMES) {
    response.cookies.set({
      name,
      value: "",
      path: "/",
      expires: new Date(0),
    })
  }

  return response
}

export async function GET(request: Request) {
  return buildLogoutResponse(request)
}

export async function POST(request: Request) {
  return buildLogoutResponse(request)
}
