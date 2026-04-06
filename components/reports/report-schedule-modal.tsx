"use client"

import { useEffect, useMemo, useState } from "react"
import { Calendar, Clock3, Loader2, Repeat, X } from "lucide-react"
import {
  disableClientSavedReportSchedule,
  loadClientReportSchedule,
  saveClientReportSchedule,
} from "@/lib/report-client"
import {
  REPORT_SCHEDULE_WEEKDAYS,
  formatScheduleTime,
} from "@/lib/report-schedule-shared"
import type {
  ReportObjectiveValue,
  ReportScheduleFrequency,
  ReportScheduleResponse,
  ReportSendMode,
} from "@/types/report.types"

type ReportScheduleModalProps = {
  open: boolean
  clientId: string | null
  clientName?: string | null
  defaultFilters: {
    since: string
    until: string
    objective: ReportObjectiveValue | string
  }
  defaultSendMode: ReportSendMode
  defaultMessage: string
  defaultGroupId?: string | null
  onClose: () => void
  onSaved?: (schedule: ReportScheduleResponse) => void
  onDisabled?: () => void
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10)
}

function getInitialTime() {
  const now = new Date()
  now.setMinutes(now.getMinutes() + 5)

  return {
    hour: now.getHours(),
    minute: now.getMinutes(),
  }
}

function buildInitialForm(props: Pick<
  ReportScheduleModalProps,
  "defaultSendMode" | "defaultMessage" | "defaultGroupId"
>) {
  const initialTime = getInitialTime()

  return {
    frequency: "WEEKLY" as ReportScheduleFrequency,
    weekday: 1,
    scheduledDate: getTodayDate(),
    hour: initialTime.hour,
    minute: initialTime.minute,
    sendMode: props.defaultSendMode,
    message: props.defaultMessage,
    groupId: props.defaultGroupId ?? "",
  }
}

export function ReportScheduleModal(props: ReportScheduleModalProps) {
  const { defaultGroupId, defaultMessage, defaultSendMode, open } = props
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [disabling, setDisabling] = useState(false)
  const [error, setError] = useState("")
  const [schedule, setSchedule] = useState<ReportScheduleResponse | null>(null)
  const [form, setForm] = useState(() => buildInitialForm(props))

  useEffect(() => {
    if (!open) {
      return
    }

    setForm(
      buildInitialForm({
        defaultGroupId,
        defaultMessage,
        defaultSendMode,
      })
    )
  }, [
    defaultGroupId,
    defaultMessage,
    defaultSendMode,
    open,
  ])

  useEffect(() => {
    if (!props.open || !props.clientId) {
      return
    }

    setLoading(true)
    setError("")

    void loadClientReportSchedule(props.clientId)
      .then((response) => {
        setSchedule(response.schedule)

        if (!response.schedule) {
          return
        }

        setForm({
          frequency: response.schedule.frequency,
          weekday: response.schedule.weekday ?? 1,
          scheduledDate: response.schedule.scheduledDate ?? getTodayDate(),
          hour: response.schedule.hour,
          minute: response.schedule.minute,
          sendMode: response.schedule.sendMode,
          message: response.schedule.message ?? props.defaultMessage,
          groupId: response.schedule.groupId ?? props.defaultGroupId ?? "",
        })
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "NÃ£o foi possÃ­vel carregar o agendamento."
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [props.clientId, props.defaultGroupId, props.defaultMessage, props.open])

  const timeValue = useMemo(
    () => formatScheduleTime(form.hour, form.minute),
    [form.hour, form.minute]
  )

  if (!props.open || !props.clientId) {
    return null
  }

  async function handleSave() {
    setSaving(true)
    setError("")

    try {
      const response = await saveClientReportSchedule(props.clientId!, {
        frequency: form.frequency,
        weekday: form.frequency === "WEEKLY" ? form.weekday : null,
        scheduledDate: form.frequency === "ONCE" ? form.scheduledDate : null,
        hour: form.hour,
        minute: form.minute,
        filtersSince: props.defaultFilters.since,
        filtersUntil: props.defaultFilters.until,
        objective: props.defaultFilters.objective,
        sendMode: form.sendMode,
        message: form.message.trim() || null,
        groupId: form.groupId.trim() || null,
        active: true,
      })

      setSchedule(response.schedule)
      props.onSaved?.(response.schedule)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "NÃ£o foi possÃ­vel salvar o agendamento."
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDisable() {
    setDisabling(true)
    setError("")

    try {
      await disableClientSavedReportSchedule(props.clientId!)
      setSchedule(null)
      props.onDisabled?.()
      props.onClose()
    } catch (disableError) {
      setError(
        disableError instanceof Error
          ? disableError.message
          : "NÃ£o foi possÃ­vel desativar o agendamento."
      )
    } finally {
      setDisabling(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
              Automação de envio
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-900">
              Agendar envio
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure o envio automático do relatório para{" "}
              <span className="font-medium text-slate-700">
                {props.clientName || "este cliente"}
              </span>
              .
            </p>
          </div>
          <button
            onClick={props.onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando agendamento atual...
            </div>
          ) : null}

          {schedule?.active ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
              <p className="font-semibold">Agendamento ativo</p>
              <p className="mt-1">
                Próximo envio: {new Date(schedule.nextRunAt).toLocaleString("pt-BR")}
              </p>
              {schedule.lastError ? (
                <p className="mt-2 text-amber-700">
                  Último erro: {schedule.lastError}
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-4 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, frequency: "WEEKLY" }))}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                form.frequency === "WEEKLY"
                  ? "border-[#C1121F] bg-[#FFF4F5]"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Repeat className="h-5 w-5 text-[#C1121F]" />
                <div>
                  <p className="font-semibold text-slate-900">Toda semana</p>
                  <p className="text-sm text-slate-500">
                    Escolha um dia fixo da semana e o horário.
                  </p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setForm((current) => ({ ...current, frequency: "ONCE" }))}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                form.frequency === "ONCE"
                  ? "border-[#C1121F] bg-[#FFF4F5]"
                  : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#C1121F]" />
                <div>
                  <p className="font-semibold text-slate-900">Somente uma vez</p>
                  <p className="text-sm text-slate-500">
                    Defina um dia específico e o horário do envio.
                  </p>
                </div>
              </div>
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {form.frequency === "WEEKLY" ? (
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Dia da semana</span>
                <select
                  value={form.weekday}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      weekday: Number(event.target.value),
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
                >
                  {REPORT_SCHEDULE_WEEKDAYS.map((weekday) => (
                    <option key={weekday.value} value={weekday.value}>
                      {weekday.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="space-y-2 text-sm text-slate-700">
                <span className="font-medium">Data do envio</span>
                <input
                  type="date"
                  value={form.scheduledDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      scheduledDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
                />
              </label>
            )}

            <label className="space-y-2 text-sm text-slate-700">
              <span className="flex items-center gap-2 font-medium">
                <Clock3 className="h-4 w-4" />
                Horário
              </span>
              <input
                type="time"
                value={timeValue}
                onChange={(event) => {
                  const [hour, minute] = event.target.value.split(":")
                  setForm((current) => ({
                    ...current,
                    hour: Number(hour),
                    minute: Number(minute),
                  }))
                }}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Formato do envio</span>
              <select
                value={form.sendMode}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    sendMode: event.target.value as ReportSendMode,
                  }))
                }
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
              >
                <option value="PDF_AND_MESSAGE">PDF + mensagem</option>
                <option value="PDF_ONLY">Somente PDF</option>
                <option value="MESSAGE_ONLY">Somente mensagem</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-slate-700">
              <span className="font-medium">Grupo de WhatsApp</span>
              <input
                type="text"
                value={form.groupId}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    groupId: event.target.value,
                  }))
                }
                placeholder="Usar grupo padrão do cliente"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm text-slate-700">
            <span className="font-medium">Mensagem do envio</span>
            <textarea
              value={form.message}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  message: event.target.value,
                }))
              }
              rows={5}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-[#C1121F]"
            />
          </label>

          <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">Base do relatório agendado</p>
            <p className="mt-1">
              Período: {props.defaultFilters.since} até {props.defaultFilters.until}
            </p>
            <p>Objetivo: {props.defaultFilters.objective}</p>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-col gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row sm:justify-between">
          <div>
            {schedule?.active ? (
              <button
                type="button"
                onClick={() => void handleDisable()}
                disabled={disabling}
                className="rounded-2xl border border-rose-200 px-4 py-3 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
              >
                {disabling ? "Desativando..." : "Desativar agendamento"}
              </button>
            ) : null}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={props.onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-2xl bg-[#C1121F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
            >
              {saving ? "Confirmando..." : "Confirmar agendamento"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
