"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Clock3,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react"
import { ReportScheduleModal } from "@/components/reports/report-schedule-modal"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  disableClientSavedReportSchedule,
  loadReportSchedules,
} from "@/lib/report-client"
import {
  REPORT_SCHEDULE_WEEKDAYS,
  formatScheduleTime,
} from "@/lib/report-schedule-shared"
import type { ClientListItem } from "@/types/client.types"
import type {
  ReportScheduleListItem,
  ReportSendMode,
} from "@/types/report.types"

type ReportSchedulesPanelProps = {
  clients: ClientListItem[]
  onSelectClient: (client: ClientListItem) => void
}

function getScheduleLabel(schedule: ReportScheduleListItem["schedule"]) {
  const time = formatScheduleTime(schedule.hour, schedule.minute)

  if (schedule.frequency === "ONCE") {
    return `${schedule.scheduledDate ?? "-"} as ${time}`
  }

  const weekdayLabel =
    REPORT_SCHEDULE_WEEKDAYS.find((weekday) => weekday.value === schedule.weekday)
      ?.label ?? "Dia nao definido"

  return `${weekdayLabel} as ${time}`
}

function getSendModeLabel(sendMode: ReportSendMode) {
  if (sendMode === "PDF_ONLY") {
    return "Somente PDF"
  }

  if (sendMode === "MESSAGE_ONLY") {
    return "Somente mensagem"
  }

  return "PDF + mensagem"
}

function formatGroupDisplay(groupId: string | null | undefined) {
  if (!groupId) {
    return "Padrao do cliente"
  }

  const separatorIndex = groupId.indexOf("::")

  if (separatorIndex < 0) {
    return groupId
  }

  return groupId.slice(separatorIndex + 2)
}

function getAvatarAccent(name: string) {
  const palette = [
    "from-[#C1121F] to-[#E85D75]",
    "from-[#0F766E] to-[#2DD4BF]",
    "from-[#1D4ED8] to-[#60A5FA]",
    "from-[#9A3412] to-[#FDBA74]",
  ]

  return palette[name.charCodeAt(0) % palette.length]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function ReportSchedulesPanel({
  clients,
  onSelectClient,
}: ReportSchedulesPanelProps) {
  const [schedules, setSchedules] = useState<ReportScheduleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState("")
  const [actionFeedback, setActionFeedback] = useState("")
  const [editingItem, setEditingItem] = useState<ReportScheduleListItem | null>(null)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)

  async function fetchSchedules(options?: { silent?: boolean }) {
    const silent = options?.silent ?? false

    if (silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError("")

    try {
      const response = await loadReportSchedules()
      setSchedules(response.schedules)
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Nao foi possivel carregar os agendamentos."
      )
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void fetchSchedules()
  }, [])

  async function handleDelete(item: ReportScheduleListItem) {
    const confirmed = window.confirm(
      `Excluir o agendamento automatico de ${item.clientName}?`
    )

    if (!confirmed) {
      return
    }

    setDeletingClientId(item.clientId)
    setError("")

    try {
      await disableClientSavedReportSchedule(item.clientId)
      setActionFeedback(`Agendamento de ${item.clientName} excluido com sucesso.`)
      setEditingItem((current) =>
        current?.clientId === item.clientId ? null : current
      )
      await fetchSchedules({ silent: true })
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Nao foi possivel excluir o agendamento."
      )
    } finally {
      setDeletingClientId(null)
    }
  }

  const editingClient = editingItem
    ? clients.find((client) => client.id === editingItem.clientId) ?? null
    : null

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void fetchSchedules({ silent: true })}
            data-cy="report-schedules-refresh"
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar status
          </button>
        </div>

        {actionFeedback ? (
          <div className="rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionFeedback}
          </div>
        ) : null}

        {error ? (
          <ErrorState
            title="Nao foi possivel carregar os agendamentos"
            message={error}
            action={
              <button
                type="button"
                onClick={() => void fetchSchedules()}
                className="text-sm font-medium text-[#C1121F] hover:underline"
              >
                Tentar novamente
              </button>
            }
          />
        ) : null}

        {loading ? (
          <div className="rounded-[32px] border border-slate-200 bg-white">
            <LoadingSkeleton label="Carregando agendamentos..." className="py-20" />
          </div>
        ) : schedules.length === 0 ? (
          <EmptyState
            title="Nenhum agendamento encontrado"
            description="Assim que voce criar um agendamento, ele aparecera aqui com o status de execucao."
            className="rounded-[32px] border-slate-200 bg-white py-20"
          />
        ) : (
          <div className="space-y-4">
            {schedules.map((item) => {
              const client = clients.find((entry) => entry.id === item.clientId) ?? null
              const nextRelevantDate =
                !item.schedule.active && item.schedule.frequency === "ONCE"
                  ? item.schedule.lastRunAt
                  : item.schedule.nextRunAt

              return (
                <article
                  key={item.schedule.id}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.46)]"
                >
                  <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_52%,#f6f9ff_100%)] px-5 py-4 sm:px-6 sm:py-5">
                    <div className="min-w-0">
                      <div className="flex items-start gap-4">
                        <div
                          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarAccent(item.clientName)} text-base font-bold text-white shadow-[0_18px_40px_-26px_rgba(15,23,42,0.65)]`}
                        >
                          {getInitials(item.clientName)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-[22px] font-semibold tracking-tight text-slate-950 sm:text-[24px]">
                            {item.clientName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {item.clientCompany ?? "Sem empresa cadastrada"}
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2.5">
                            <StatusBadge
                              tone={item.clientStatus === "ACTIVE" ? "success" : "neutral"}
                            >
                              {item.clientStatus === "ACTIVE" ? "Ativo" : "Inativo"}
                            </StatusBadge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                    <div className="rounded-[28px] border border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-3 sm:p-4">
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Frequencia
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <p className="text-[18px] font-semibold leading-[1.28] tracking-tight text-slate-900 sm:text-[19px]">
                            {getScheduleLabel(item.schedule)}
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Envio
                        </p>
                        <p className="mt-3 text-[18px] font-semibold leading-[1.2] tracking-tight text-slate-900 sm:text-[19px]">
                          {getSendModeLabel(item.schedule.sendMode)}
                        </p>
                        <p className="mt-2 break-all text-sm leading-6 text-slate-500">
                          Grupo:{" "}
                          {formatGroupDisplay(
                            item.schedule.groupId ?? item.clientWhatsappGroupId
                          )}
                        </p>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.schedule.active ? "Proximo evento" : "Ultima execucao"}
                        </p>
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                            <Clock3 className="h-4 w-4" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-[18px] font-semibold leading-[1.25] tracking-tight text-slate-900 sm:text-[19px]">
                              {nextRelevantDate
                                ? new Date(nextRelevantDate).toLocaleString("pt-BR")
                                : "Sem horario"}
                            </p>
                            {item.lastSendAttemptAt ? (
                              <p className="text-sm leading-6 text-slate-500">
                                Ultima tentativa:{" "}
                                {new Date(item.lastSendAttemptAt).toLocaleString("pt-BR")}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                    {item.lastSendError ? (
                      <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
                        <p className="font-semibold">Ultimo erro</p>
                        <p className="mt-1 leading-6">{item.lastSendError}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={() => client && onSelectClient(client)}
                        data-cy="report-schedule-open-client"
                        disabled={!client}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Abrir cliente
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        data-cy="report-schedule-edit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        data-cy="report-schedule-delete"
                        disabled={deletingClientId === item.clientId}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        {deletingClientId === item.clientId ? "Excluindo..." : "Excluir"}
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <ReportScheduleModal
        open={Boolean(editingItem)}
        clientId={editingItem?.clientId ?? null}
        clientName={editingItem?.clientName ?? null}
        defaultFilters={{
          since: editingItem?.schedule.filtersSince ?? "",
          until: editingItem?.schedule.filtersUntil ?? "",
          objective: editingItem?.schedule.objective ?? "ALL",
        }}
        defaultSendMode={editingItem?.schedule.sendMode ?? "PDF_AND_MESSAGE"}
        defaultMessage={editingItem?.schedule.message ?? ""}
        defaultGroupId={
          editingItem?.schedule.groupId ??
          editingItem?.clientWhatsappGroupId ??
          editingClient?.whatsappGroupId ??
          null
        }
        onClose={() => setEditingItem(null)}
        onSaved={({ schedules: savedSchedules }) => {
          const savedSchedule = savedSchedules[0]

          if (savedSchedule) {
            setActionFeedback(
              `Agendamento de ${editingItem?.clientName ?? "cliente"} atualizado. Proximo envio em ${new Date(savedSchedule.nextRunAt).toLocaleString("pt-BR")}.`
            )
          }

          setEditingItem(null)
          void fetchSchedules({ silent: true })
        }}
        onDisabled={() => {
          setActionFeedback(
            `Agendamento de ${editingItem?.clientName ?? "cliente"} excluido com sucesso.`
          )
          setEditingItem(null)
          void fetchSchedules({ silent: true })
        }}
      />
    </>
  )
}
