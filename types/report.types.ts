export type ReportStatusValue = "PENDING" | "SENT" | "FAILED"

export type ReportAction = {
  action_type?: string
  value?: string
}

export type ReportInsight = {
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  ctr?: string
  cpc?: string
  cpm?: string
  actions?: ReportAction[]
  action_values?: ReportAction[]
  date_start?: string
}

export type ReportCampaign = {
  id: string
  name: string
  status: string
  objective?: string
  insights?: {
    data?: ReportInsight[]
  }
}

export type ReportClient = {
  id: string
  name: string
  company: string | null
  email?: string | null
  adAccountId?: string | null
}

export type ReportPayload = {
  client?: ReportClient
  campaigns: ReportCampaign[]
  accountInsights?: ReportInsight
  dailyInsights?: ReportInsight[]
}

export type ReportFilters = {
  since: string
  until: string
  objective: string
  generatedAt: string
}

export type StoredReportPayload = ReportPayload & {
  client: ReportClient
  filters: ReportFilters
}

export type ReportGenerationResponse = ReportPayload & {
  reportId: string
  generatedAt: string
  referenceWeek: string
}

export type SavedReportResponse = {
  id: string
  status: ReportStatusValue
  generatedAt: string
  referenceWeek: string
  payload: StoredReportPayload
}

export type HistoryRow = {
  id: string
  date: string
  time: string
  clientId: string
  client: string
  company: string
  status: ReportStatusValue
  attempts: number
  errorMessage: string | null
  referenceWeek: string
}
