export type ReportObjectiveValue =
  | "ALL"
  | "LINK_CLICKS"
  | "CONVERSIONS"
  | "MESSAGES"

export type ReportStatusValue = "PENDING" | "SENT" | "FAILED" | "CANCELLED"

export type ReportJobStage = "GENERATION" | "SEND"
export type PendingReportJobKind = "GENERATION" | "SEND"

export type ReportSendMode =
  | "PDF_AND_MESSAGE"
  | "PDF_ONLY"
  | "MESSAGE_ONLY"

export type ReportScheduleFrequency = "ONCE" | "WEEKLY"

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

export type ReportPresentationOptions = {
  customTitle?: string
  executiveSummary?: string
  closingNotes?: string
  sections?: ReportSectionVisibility
  metrics?: ReportMetricVisibility
  insightsEnabled?: boolean
}

export type ReportJobError = {
  message: string
  stage: ReportJobStage
  failedAt: string
  scheduledAt?: string | null
  nextAttemptAt?: string | null
  groupId?: string | null
  groupName?: string | null
}

export type PendingReportSendOptions = {
  mode?: ReportSendMode
  message?: string | null
  groupId?: string | null
}

export type PendingReportSource = "manual" | "schedule" | "weekly"

export type PendingReportJobLease = {
  lockedAt: string
  lockToken: string
}

export type PendingReportJob = {
  kind?: PendingReportJobKind
  queuedAt: string
  scheduledSendAt?: string | null
  requestedByUserId: string
  source: PendingReportSource
  filters: {
    since: string
    until: string
    objective: string
  }
  enqueueSendOnComplete: boolean
  sendOptions: PendingReportSendOptions | null
  presentation?: ReportPresentationOptions | null
  storedPayload?: StoredReportPayload | null
  attemptCount?: number
  maxAttempts?: number
  nextAttemptAt?: string
  lastAttemptAt?: string | null
  lastError?: string | null
  lease?: PendingReportJobLease | null
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
  presentation?: ReportPresentationOptions
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
  presentation?: ReportPresentationOptions
}

export type StoredReportPayload = ReportPayload & {
  client: ReportClient
  filters: ReportFilters
  presentation?: ReportPresentationOptions
  uiMessageOverride?: string | null
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

export type ReportRescheduleResponse = {
  ok: true
  reportId: string
  scheduledAt: string
  status: ReportStatusValue
}

export type ReportCancelResponse = {
  ok: true
  reportId: string
  status: ReportStatusValue
  cancelled: true
}

export type ReportSendRequest = {
  mode?: ReportSendMode
  message?: string
  pdfBase64?: string
  pdfFileName?: string
  groupId?: string
  presentation?: ReportPresentationOptions
}

export type ReportSchedulePayload = {
  frequency: ReportScheduleFrequency
  weekday?: number | null
  scheduledDate?: string | null
  hour: number
  minute: number
  filtersSince: string
  filtersUntil: string
  objective: ReportObjectiveValue | string
  sendMode: ReportSendMode
  message?: string | null
  groupId?: string | null
  active?: boolean
}

export type ReportScheduleResponse = {
  id: string
  clientId: string
  frequency: ReportScheduleFrequency
  weekday: number | null
  scheduledDate: string | null
  hour: number
  minute: number
  timeZone: string
  filtersSince: string
  filtersUntil: string
  objective: string
  sendMode: ReportSendMode
  message: string | null
  groupId: string | null
  active: boolean
  nextRunAt: string
  lastRunAt: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

export type ReportScheduleStatusValue =
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "SENT"
  | "FAILED"

export type ReportScheduleListItem = {
  clientId: string
  clientName: string
  clientCompany: string | null
  clientStatus: string
  clientWhatsappGroupId: string | null
  clientWhatsappGroupName: string | null
  schedule: ReportScheduleResponse
  status: ReportScheduleStatusValue
  statusLabel: string
  statusDetail: string | null
  lastReportId: string | null
  lastReportGeneratedAt: string | null
  lastSendAttemptAt: string | null
  lastSendError: string | null
}

export type SavedReportResponse = {
  id: string
  status: ReportStatusValue
  generatedAt: string
  referenceWeek: string
  payload: StoredReportPayload | null
  errorMessage: string | null
}

export type SavedReportMessageResponse = {
  ok: true
  reportId: string
  message: string | null
}

export type HistoryRow = {
  id: string
  reportId: string | null
  source: "report" | "schedule"
  date: string
  time: string
  clientId: string
  client: string
  company: string
  groupId: string | null
  groupName: string | null
  scheduledAt: string | null
  sentAt: string | null
  nextSendAt: string | null
  status: ReportStatusValue
  attempts: number
  errorMessage: string | null
  referenceWeek: string
}
