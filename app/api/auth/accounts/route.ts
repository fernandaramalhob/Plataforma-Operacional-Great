import { NextResponse } from "next/server"
import { getAuthLoginAccounts } from "@/lib/auth-accounts"

export const runtime = "nodejs"

export async function GET() {
  return NextResponse.json({
    accounts: getAuthLoginAccounts(),
  })
}
