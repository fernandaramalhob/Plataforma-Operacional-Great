import { notFound } from "next/navigation"
import { ReportPreview } from "@/components/reports/report-preview"
import { prisma } from "@/lib/prisma"
import { parseStoredReportPayload } from "@/lib/report-domain"
import { verifyReportPdfAccessToken } from "@/lib/report-pdf-preview-server"

export const dynamic = "force-dynamic"
export const revalidate = 0
export const runtime = "nodejs"

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string | string[] }>
}

function readToken(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ReportPdfPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { token: rawToken } = await searchParams
  const token = readToken(rawToken)

  if (!token || !verifyReportPdfAccessToken(id, token)) {
    notFound()
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: {
      id: true,
      payloadJson: true,
    },
  })

  if (!report) {
    notFound()
  }

  const payload = parseStoredReportPayload(report.payloadJson)

  if (!payload) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-6 py-6 print:min-h-0 print:bg-white print:px-0 print:py-0">
      <ReportPreview
        client={payload.client}
        reportData={payload}
        startDate={payload.filters.since}
        endDate={payload.filters.until}
        objective={payload.filters.objective}
        selectedCampaignIds={payload.campaigns.map((campaign) => campaign.id)}
        insightsEnabled
        variant="pdf"
      />
    </main>
  )
}
