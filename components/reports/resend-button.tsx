"use client"

import { useEffect, useState } from "react"
import { CalendarClock, Loader2, RotateCcw, X } from "lucide-react"
import { rescheduleQueuedReport } from "@/lib/report-client"

type ReportResendButtonProps = {
  reportId: string
  reportLabel: string
  defaultScheduledAt?: string | null
  onRescheduled?: (scheduledAt: string) => void
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

export function ReportResendButton({
  reportId,
  reportLabel,
  defaultScheduledAt,
  onRescheduled,
}: ReportResendButtonProps) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")

  useEffect(() => {
    if (open) {
      const nextDateTime = buildInitialDateTime(defaultScheduledAt)
      setDate(nextDateTime.date)
      setTime(nextDateTime.time)
      setError("")
    }
  }, [defaultScheduledAt, open])

  async function handleConfirm() {
    const scheduledAt = new Date(`${date}T${time}:00`)

    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      setError("Escolha uma data e horario futuros.")
      return
    }

    setSaving(true)
    setError("")

    try {
      const response = await rescheduleQueuedReport(
        reportId,
        scheduledAt.toISOString()
      )

      setOpen(false)
      onRescheduled?.(response.scheduledAt)
    } catch (rescheduleError) {
      setError(
        rescheduleError instanceof Error
          ? rescheduleError.message
          : "Nao foi possivel reagendar o relatorio"
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Reagendar envio de ${reportLabel}`}
        title={`Reagendar envio de ${reportLabel}`}
        className="inline-flex h-8 w-8 items-center justify-center text-[#C1121F] transition hover:text-[#A50F1A]"
      >
        <RotateCcw className="h-4 w-4" />
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
          <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Reagendar envio
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                  Escolha um novo horario
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Ajuste o proximo envio do relatorio de{" "}
                  <span className="font-medium text-slate-700">{reportLabel}</span>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                    <CalendarClock className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Novo agendamento
                    </p>
                    <p className="text-xs text-slate-500">
                      Defina a data e a hora do envio novamente.
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

              {error ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
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
                {saving ? "Reagendando..." : "Confirmar novo horario"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
