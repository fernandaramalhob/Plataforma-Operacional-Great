import { NextResponse } from "next/server"
import { readFile } from "node:fs/promises"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const maxDuration = 60

const BACKUP_FILE_URL = new URL(
  "../../../../data/backups/greatgo-backup.zip",
  import.meta.url
)

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const backupBuffer = await readFile(BACKUP_FILE_URL)

  return new NextResponse(backupBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="greatgo-backup.zip"',
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  })
}
