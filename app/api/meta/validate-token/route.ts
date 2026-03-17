//GET

import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({ ok: true })
}


//POST

/*import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const token = body.token

  if (!token) {
    return NextResponse.json(
      { error: "Token não enviado" },
      { status: 400 }
    )
  }

  return NextResponse.json({ valid: true })
}*/ 