export type ReportObjectiveValue =
  | "ALL"
  | "LINK_CLICKS"
  | "CONVERSIONS"
  | "MESSAGES"

export type ReportStatusValue = "PENDING" | "SENT" | "FAILED"

export type ReportJobStage = "GENERATION" | "SEND"

export type ReportSendMode =
  | "PDF_AND_MESSAGE"
  | "PDF_ONLY"
  | "MESSAGE_ONLY"

export type ReportSectionKey =
  | "overview"
  | "advancedMetrics"
  | "chart"
  | "campaignTable"
  | "topAds"
  | "gender"
  | "insights"
  | "summary"
  | "notes"

export type ReportSectionVisibility = Record<ReportSectionKey, boolean>

export type ReportMetricKey =
  | "spend"
  | "impressions"
  | "reach"
  | "clicks"
  | "ctr"
  | "cpc"
  | "cpm"
  | "conversationsStarted"
  | "costPerConversation"
  | "conversationRate"

export type ReportMetricVisibility = Record<ReportMetricKey, boolean>

export type ReportTemplateDraft = {
  name: string
  customTitle: string
  executiveSummary: string
  closingNotes: string
  sections: ReportSectionVisibility
  metrics: ReportMetricVisibility
  sendMode: ReportSendMode
  sendMessage: string
  updatedAt?: string
}

export type ReportJobError = {
  message: string
  stage: ReportJobStage
  failedAt: string
}

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

export type ReportBreakdownRow = {
  dimension: string
  spend?: string
  impressions?: string
  reach?: string
  clicks?: string
  actions?: ReportAction[]
}

export type ReportAd = {
  id: string
  name: string
  impressions?: string
  reach?: string
  clicks?: string
  spend?: string
  actions?: ReportAction[]
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
  topAds?: ReportAd[]
  genderBreakdown?: ReportBreakdownRow[]
}

export type ReportFilters = {
  since: string
  until: string
  objective: ReportObjectiveValue | string
  generatedAt: string
}

export type ReportRequest = {
  clientId: string
  since: string
  until: string
  objective?: ReportObjectiveValue
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

export type QueuedReportResponse = {
  reportId: string
  status: ReportStatusValue
  generatedAt: string
  referenceWeek: string
  queued: true
}

export type ReportSendResponse = {
  ok: true
  queued: boolean
  reportId: string
  jobId: string | null
  status: ReportStatusValue
}

export type ReportSendRequest = {
  mode?: ReportSendMode
  message?: string
  pdfBase64?: string
  pdfFileName?: string
}

export type SavedReportResponse = {
  id: string
  status: ReportStatusValue
  generatedAt: string
  referenceWeek: string
  payload: StoredReportPayload | null
  errorMessage: string | null
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
