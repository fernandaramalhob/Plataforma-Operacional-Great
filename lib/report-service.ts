import type { Client, User } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { buildReferenceWeekDate, buildStoredReportPayload, serializeStoredReportPayload } from "@/lib/report-domain"
import { resolveMetaTokenCandidate } from "@/lib/meta-token"
import { logError } from "@/lib/safe-logger"
import type {
  ReportClient,
  ReportGenerationResponse,
  ReportPayload,
} from "@/types/report.types"

type ReportUser = Pick<User, "id" | "metaAccessToken">

type ClientWithManager = Pick<
  Client,
  "id" | "name" | "company" | "adAccountId" | "managerId"
> & {
  manager: Pick<User, "id" | "metaAccessToken"> | null
}

type ReportFiltersInput = {
  since: string
  until: string
  objective: string
}

function buildClientPayload(client: ClientWithManager): ReportClient {
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    adAccountId: client.adAccountId,
  }
}

async function fetchMetaJson(url: string) {
  const response = await fetch(url, { cache: "no-store" })
  const data = (await response.json()) as {
    error?: { message?: string }
    data?: unknown
  }

  if (!response.ok || data.error) {
    throw new Error(data.error?.message ?? "Falha ao consultar a META API")
  }

  return data
}

async function resolveMetaToken(user: ReportUser, client: ClientWithManager) {
  const tokenCandidate = resolveMetaTokenCandidate(
    client.manager?.metaAccessToken,
    user.metaAccessToken
  )

  if (tokenCandidate?.encryptedToken) {
    const tokenOwnerId = tokenCandidate.index === 0 ? client.manager?.id : user.id

    if (tokenOwnerId) {
      try {
        await prisma.user.update({
          where: { id: tokenOwnerId },
          data: { metaAccessToken: tokenCandidate.encryptedToken },
        })
      } catch (error) {
        logError("reports.reencrypt", error, { userId: tokenOwnerId })
      }
    }
  }

  return tokenCandidate?.token ?? null
}

export async function generateLiveReportPayload(params: {
  user: ReportUser
  client: ClientWithManager
  filters: ReportFiltersInput
}): Promise<ReportPayload> {
  const { user, client, filters } = params

  if (!client.adAccountId) {
    throw new Error("Cliente sem conta META configurada")
  }

  const token = await resolveMetaToken(user, client)

  if (!token) {
    throw new Error("Token META nao configurado")
  }

  const timeRange = `&time_range={"since":"${filters.since}","until":"${filters.until}"}`
  const fields = [
    "id",
    "name",
    "status",
    "objective",
    "insights{spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values}",
  ].join(",")
  const encodedToken = encodeURIComponent(token)

  let campaignsUrl = `https://graph.facebook.com/v18.0/${client.adAccountId}/campaigns?fields=${fields}&access_token=${encodedToken}&limit=50${timeRange}`

  if (filters.objective !== "ALL") {
    campaignsUrl += `&filtering=[{"field":"objective","operator":"IN","value":["${filters.objective}"]}]`
  }

  const [campaignsData, accountData, dailyData] = await Promise.all([
    fetchMetaJson(campaignsUrl),
    fetchMetaJson(
      `https://graph.facebook.com/v18.0/${client.adAccountId}/insights?fields=spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values&access_token=${encodedToken}${timeRange}`
    ),
    fetchMetaJson(
      `https://graph.facebook.com/v18.0/${client.adAccountId}/insights?fields=spend,impressions,clicks,actions&time_increment=1&access_token=${encodedToken}${timeRange}`
    ),
  ])

  return {
    client: buildClientPayload(client),
    campaigns: Array.isArray(campaignsData.data) ? campaignsData.data : [],
    accountInsights:
      Array.isArray(accountData.data) && accountData.data[0]
        ? (accountData.data[0] as ReportPayload["accountInsights"])
        : {},
    dailyInsights: Array.isArray(dailyData.data) ? dailyData.data : [],
  }
}

export async function persistGeneratedReport(params: {
  clientId: string
  payload: ReportPayload
  filters: ReportFiltersInput
}): Promise<ReportGenerationResponse> {
  const generatedAt = new Date()
  const storedPayload = buildStoredReportPayload(
    params.payload,
    params.filters,
    generatedAt
  )
  const report = await prisma.report.create({
    data: {
      clientId: params.clientId,
      referenceWeek: buildReferenceWeekDate(params.filters.since),
      status: "PENDING",
      payloadJson: serializeStoredReportPayload(storedPayload),
    },
  })

  return {
    ...params.payload,
    reportId: report.id,
    generatedAt: report.generatedAt.toISOString(),
    referenceWeek: report.referenceWeek.toISOString(),
  }
}
