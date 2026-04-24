"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2, X } from "lucide-react"
import { rescheduleQueuedReport, rescheduleQueuedReports } from "@/lib/report-client"

type BulkReportResendModalProps = {
  open: boolean
  items: Array<{
    id: string
    source: "report" | "schedule"
    clientId: string
    label: string
  }>
  defaultScheduledAt?: string | null
  onClose: () => void
  onSaved: (result: { scheduledAt: string; succeeded: number; failed: number }) => void
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function toDateInputValue(value: Date) {
  return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(
    value.getDate()
  )}`
}

function toTimeInputValue(value: Date) {
  return `${pad2(value.getHours())}:${pad2(value.getMinutes())}`
}

function buildInitialDateTime(defaultScheduledAt?: string | null) {
  const candidate = defaultScheduledAt ? new Date(defaultScheduledAt) : new Date()
  if (Number.isNaN(candidate.getTime()) || candidate.getTime() <= Date.now()) {
    candidate.setTime(Date.now() + 15 * 60 * 1000)
  }

  return {
    date: toDateInputValue(candidate),
    time: toTimeInputValue(candidate),
  }
}

export function BulkReportResendModal({
  open,
  items,
  defaultScheduledAt,
  onClose,
  onSaved,
}: BulkReportResendModalProps) {
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!open) {
      return
    }

    const nextDateTime = buildInitialDateTime(defaultScheduledAt)
    setDate(nextDateTime.date)
    setTime(nextDateTime.time)
    setError("")
  }, [defaultScheduledAt, open])

  if (!open || items.length === 0) {
    return null
  }

  async function handleConfirm() {
    const scheduledAt = new Date(`${date}T${time}:00`)

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError("Escolha uma data e horario futuros.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const reportItems = items.filter((item) => item.source === "report")
      const scheduleItems = items.filter((item) => item.source === "schedule")

      const [reportResult, scheduleResult] = await Promise.all([
        reportItems.length > 0
          ? rescheduleQueuedReports(
              reportItems.map((item) => item.id),
              scheduledAt.toISOString()
            )
          : Promise.resolve({ succeeded: 0, failed: 0 }),
        scheduleItems.length > 0
          ? fetch("/api/reports/schedules/reschedule", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                clientIds: scheduleItems.map((item) => item.clientId),
                scheduledAt: scheduledAt.toISOString(),
              }),
            }).then(async (response) => {
              if (!response.ok) {
                throw new Error("Nao foi possivel reagendar os agendamentos")
              }

              return (await response.json()) as {
                succeeded: number
                failed: number
              }
            })
          : Promise.resolve({ succeeded: 0, failed: 0 }),
      ])

      onSaved({
        scheduledAt: scheduledAt.toISOString(),
        succeeded: reportResult.succeeded + scheduleResult.succeeded,
        failed: reportResult.failed + scheduleResult.failed,
      })
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error
          ? rescheduleError.message
          : "Nao foi possivel reagendar os relatorios"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Reenviar em lote
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Escolha a nova hora
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} relatórios selecionados para reagendamento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
            <p className="text-sm font-semibold text-slate-900">
                  Reagendar envio dos selecionados
                </p>
                <p className="text-xs text-slate-500">
                  Você pode mandar todos no mesmo horário.
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Data</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Horário</span>
              <input
                type="time"
                value={time}
                onChange={(event) => setTime(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Selecionados</p>
            <p className="mt-1 break-words">{items.map((item) => item.label).join(", ")}</p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C1121F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Reagendando..." : "Confirmar horário"}
          </button>
        </div>
      </div>
    </div>
  )
}
