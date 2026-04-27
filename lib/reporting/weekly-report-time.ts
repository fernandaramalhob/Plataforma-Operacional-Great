import {
  REPORT_AUTOMATION_DEFAULT_TIMEZONE,
  resolveReportAutomationWindow,
  type ReportAutomationWindow,
} from "@/lib/report-automation"

export const WEEKLY_REPORT_DEFAULT_TIMEZONE = "America/Recife"

function padWeek(value: number) {
  return String(value).padStart(2, "0")
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)

  if (!match) {
    throw new Error(`Data semanal inválida: '${value}'.`)
  }

  const [, year, month, day] = match

  return new Date(
    Date.UTC(
      Number.parseInt(year, 10),
      Number.parseInt(month, 10) - 1,
      Number.parseInt(day, 10)
    )
  )
}

export function resolveWeeklyReportTimeZone(
  env: Record<string, string | undefined> = process.env
) {
  return (
    env.REPORT_TIMEZONE?.trim()
    || env.REPORT_AUTOMATION_TIMEZONE?.trim()
    || env.REPORT_WEEKLY_TZ?.trim()
    || WEEKLY_REPORT_DEFAULT_TIMEZONE
    || REPORT_AUTOMATION_DEFAULT_TIMEZONE
  )
}

export function resolveWeeklyReportWindow(params?: {
  timeZone?: string
  referenceDate?: Date
}) {
  const timeZone = params?.timeZone || resolveWeeklyReportTimeZone()

  return resolveReportAutomationWindow({
    timezone: timeZone,
    referenceDate: params?.referenceDate,
  })
}

export function buildWeeklyReportWeekKey(window: ReportAutomationWindow) {
  const target = parseIsoDate(window.since)
  const day = target.getUTCDay() || 7

  target.setUTCDate(target.getUTCDate() + 4 - day)

  const isoYear = target.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4))
  const firstDay = firstThursday.getUTCDay() || 7

  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstDay)

  const diffMs = target.getTime() - firstThursday.getTime()
  const weekNumber = 1 + Math.round(diffMs / 604_800_000)

  return `${isoYear}-W${padWeek(weekNumber)}`
}
