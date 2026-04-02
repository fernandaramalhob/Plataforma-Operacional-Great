import { randomUUID } from "node:crypto"
import { type Client, Prisma, type User } from "@prisma/client"
import {
  buildMetaTimeRange,
  getMetaCampaigns,
  getMetaInsights,
} from "@/lib/meta-api"
import { prisma } from "@/lib/prisma"
import {
  buildReferenceWeekDate,
  buildStoredReportPayload,
  serializeStoredReportPayload,
} from "@/lib/report-domain"
import { resolveMetaTokenFromOwners, type MetaTokenOwner } from "@/lib/meta-token-status"
import type {
  ReportAction,
  ReportClient,
  ReportGenerationResponse,
  ReportPayload,
} from "@/types/report.types"

type ReportUser = Pick<User, "id" | "metaAccessToken" | "metaTokenExpiresAt">

type ClientWithManager = Pick<
  Client,
  "id" | "name" | "company" | "adAccountId" | "managerId"
> & {
  manager: Pick<User, "id" | "metaAccessToken" | "metaTokenExpiresAt"> | null
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

async function resolveMetaToken(user: ReportUser, client: ClientWithManager) {
  const owners: MetaTokenOwner[] = [
    {
      id: client.manager?.id ?? user.id,
      metaAccessToken: client.manager?.metaAccessToken ?? null,
      metaTokenExpiresAt: client.manager?.metaTokenExpiresAt ?? null,
    },
    {
      id: user.id,
      metaAccessToken: user.metaAccessToken,
      metaTokenExpiresAt: user.metaTokenExpiresAt,
    },
  ]
  const { health } = await resolveMetaTokenFromOwners(owners)

  if (!health.ok || !health.token) {
    throw new Error(health.detail ?? "Token META nÃ£o configurado")
  }

  return health.token
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
  const timeRange = buildMetaTimeRange(filters.since, filters.until)
  const campaignFields = [
    "id",
    "name",
    "status",
    "objective",
    "insights{spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values}",
  ].join(",")
  const filtering =
    filters.objective !== "ALL"
      ? JSON.stringify([
          {
            field: "objective",
            operator: "IN",
            value: [filters.objective],
          },
        ])
      : undefined

  const [
    campaigns,
    accountInsights,
    dailyInsights,
    topAds,
    genderBreakdown,
  ] = await Promise.all([
    getMetaCampaigns({
      adAccountId: client.adAccountId,
      token,
      fields: campaignFields,
      limit: 50,
      timeRange,
      filtering,
    }),
    getMetaInsights({
      objectId: client.adAccountId,
      token,
      fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,actions,action_values",
      timeRange,
    }),
    getMetaInsights({
      objectId: client.adAccountId,
      token,
      fields: "spend,impressions,clicks,actions",
      timeRange,
      timeIncrement: 1,
    }),
    getMetaInsights({
      objectId: client.adAccountId,
      token,
      fields: "ad_id,ad_name,spend,impressions,reach,clicks,actions",
      timeRange,
      level: "ad",
      limit: 20,
    }),
    getMetaInsights({
      objectId: client.adAccountId,
      token,
      fields: "spend,impressions,reach,clicks,actions",
      timeRange,
      breakdowns: "gender",
      limit: 20,
    }),
  ])

  return {
    client: buildClientPayload(client),
    campaigns: campaigns as ReportPayload["campaigns"],
    accountInsights: accountInsights[0]
      ? (accountInsights[0] as ReportPayload["accountInsights"])
      : {},
    dailyInsights: dailyInsights as ReportPayload["dailyInsights"],
    topAds: topAds
      .slice()
      .sort(
        (left, right) =>
          Number.parseFloat(right.impressions ?? "0") -
          Number.parseFloat(left.impressions ?? "0")
      )
      .slice(0, 5)
      .map((ad) => ({
        id: ad.ad_id ?? randomUUID(),
        name: ad.ad_name ?? "AnÃºncio sem nome",
        impressions: ad.impressions,
        reach: ad.reach,
        clicks: ad.clicks,
        spend: ad.spend,
        actions: ad.actions as ReportAction[] | undefined,
      })),
    genderBreakdown: genderBreakdown.map((row) => ({
      dimension: row.gender ?? "nÃ£o informado",
      spend: row.spend,
      impressions: row.impressions,
      reach: row.reach,
      clicks: row.clicks,
      actions: row.actions as ReportAction[] | undefined,
    })),
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
