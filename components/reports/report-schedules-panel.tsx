"use client"

import { useEffect, useState } from "react"
import {
  Calendar,
  Clock3,
  Pencil,
  RefreshCw,
  Trash2,
  X,
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
      ?.label ?? "Dia não definido"

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
    return "Padrão do cliente"
  }

  const separatorIndex = groupId.indexOf("::")

  if (separatorIndex < 0) {
    return groupId
  }

  return groupId.slice(separatorIndex + 2)
}

function formatGroupName(groupName: string | null | undefined) {
  const trimmed = groupName?.trim()

  return trimmed ? trimmed : null
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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Não informado"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "Não informado"
  }

  return date.toLocaleString("pt-BR")
}

function getStatusTone(
  status: ReportScheduleListItem["status"]
): "neutral" | "success" | "danger" | "warning" | "info" {
  if (status === "SENT") {
    return "success"
  }

  if (status === "FAILED") {
    return "danger"
  }

  if (status === "IN_PROGRESS") {
    return "warning"
  }

  return "neutral"
}

type ScheduleDetailsModalProps = {
  item: ReportScheduleListItem
  client: ClientListItem | null
  onClose: () => void
  onEdit: () => void
  onOpenClient: () => void
  onDelete: () => void
}

function ScheduleDetailsModal({
  item,
  client,
  onClose,
  onEdit,
  onOpenClient,
  onDelete,
}: ScheduleDetailsModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div className="mx-auto flex h-full w-full max-w-4xl items-center justify-center">
        <div
          className="max-h-[92vh] w-full overflow-hidden rounded-[32px] bg-white shadow-2xl"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={`Detalhes do agendamento de ${item.clientName}`}
        >
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                Detalhes do bloco
              </p>
              <h2 className="mt-2 truncate text-2xl font-semibold text-slate-950">
                {item.clientName}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Toque fora do pop-up para fechar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              aria-label="Fechar detalhes"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[calc(92vh-145px)] space-y-5 overflow-y-auto px-6 py-5">
            <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fff8f8_0%,#ffffff_52%,#f6f9ff_100%)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${getAvatarAccent(item.clientName)} text-lg font-bold text-white shadow-[0_18px_40px_-26px_rgba(15,23,42,0.65)]`}
                  >
                    {getInitials(item.clientName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[24px] font-semibold tracking-tight text-slate-950">
                      {item.clientName}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.clientCompany ?? "Sem empresa cadastrada"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge tone={item.clientStatus === "ACTIVE" ? "success" : "neutral"}>
                        {item.clientStatus === "ACTIVE" ? "Ativo" : "Inativo"}
                      </StatusBadge>
                      <StatusBadge tone={getStatusTone(item.status)}>
                        {item.statusLabel}
                      </StatusBadge>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                  <p className="font-semibold text-slate-800">Agenda</p>
                  <p className="mt-1">{getScheduleLabel(item.schedule)}</p>
                  <p className="mt-1">{getSendModeLabel(item.schedule.sendMode)}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Frequência
                </p>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[18px] font-semibold leading-[1.28] tracking-tight text-slate-900">
                      {getScheduleLabel(item.schedule)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.schedule.frequency === "ONCE"
                        ? "Execução unica"
                        : "Execução recorrente semanal"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Envio
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-[18px] font-semibold leading-[1.2] tracking-tight text-slate-900">
                    {getSendModeLabel(item.schedule.sendMode)}
                  </p>
                  <p className="break-words text-sm leading-6 text-slate-500">
                    Grupo:{" "}
                    {formatGroupDisplay(item.schedule.groupId ?? item.clientWhatsappGroupId)}
                  </p>
                  {formatGroupName(item.clientWhatsappGroupName) ? (
                    <p className="break-words text-sm leading-6 text-slate-400">
                      {formatGroupName(item.clientWhatsappGroupName)}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Próxima execução
                </p>
                <div className="mt-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-[#C1121F]">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[18px] font-semibold leading-[1.25] tracking-tight text-slate-900">
                      {item.schedule.active
                        ? formatDateTime(item.schedule.nextRunAt)
                        : formatDateTime(item.schedule.lastRunAt)}
                    </p>
                    <p className="text-sm text-slate-500">
                      {item.schedule.active ? "Próximo evento" : "Última execução"}
                    </p>
                    {item.lastSendAttemptAt ? (
                      <p className="text-sm text-slate-500">
                        Última tentativa: {formatDateTime(item.lastSendAttemptAt)}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Status
                </p>
                <div className="mt-3 space-y-2">
                  <p className="text-[18px] font-semibold leading-[1.2] tracking-tight text-slate-900">
                    {item.statusLabel}
                  </p>
                  <p className="text-sm text-slate-500">
                    {item.statusDetail ?? "Sem detalhes adicionais."}
                  </p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Cliente
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Grupo do cliente: {item.clientWhatsappGroupId ?? "Não informado"}</p>
                  <p>E-mail: {client?.email ?? "Não informado"}</p>
                  <p>Conta: {client?.adAccountId ?? "Não informada"}</p>
                </div>
              </div>

              <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Último envio
                </p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <p>Relatório: {item.lastReportId ?? "Não vinculado"}</p>
                  <p>Gerado em: {formatDateTime(item.lastReportGeneratedAt)}</p>
                  <p>Último erro: {item.lastSendError ?? "Sem erro registrado"}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-2">
              <button
                type="button"
                onClick={onOpenClient}
                disabled={!client}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Abrir cliente
              </button>
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Editar
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white px-5 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
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
  const [detailsItem, setDetailsItem] = useState<ReportScheduleListItem | null>(null)
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
          : "Não foi possível carregar os agendamentos."
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
      `Excluir o agendamento automático de ${item.clientName}?`
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
          : "Não foi possível excluir o agendamento."
      )
    } finally {
      setDeletingClientId(null)
    }
  }

  const editingClient = editingItem
    ? clients.find((client) => client.id === editingItem.clientId) ?? null
    : null
  const detailsClient = detailsItem
    ? clients.find((client) => client.id === detailsItem.clientId) ?? null
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
            title="Não foi possível carregar os agendamentos"
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
            description="Assim que você criar um agendamento, ele aparecera aqui com o status de execução."
            className="rounded-[32px] border-slate-200 bg-white py-20"
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {schedules.map((item) => {
              const client = clients.find((entry) => entry.id === item.clientId) ?? null
              const nextRelevantDate =
                !item.schedule.active && item.schedule.frequency === "ONCE"
                  ? item.schedule.lastRunAt
                  : item.schedule.nextRunAt

              return (
                <article
                  key={item.schedule.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetailsItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault()
                      setDetailsItem(item)
                    }
                  }}
                  className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_24px_70px_-46px_rgba(15,23,42,0.46)] transition hover:-translate-y-0.5 hover:shadow-[0_30px_80px_-44px_rgba(15,23,42,0.52)] focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10"
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
                            <StatusBadge tone={getStatusTone(item.status)}>
                              {item.statusLabel}
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
                          Frequência
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
                        <div className="mt-2 space-y-1 break-all text-sm leading-6 text-slate-500">
                          <p>
                            Grupo:{" "}
                            {formatGroupDisplay(
                              item.schedule.groupId ?? item.clientWhatsappGroupId
                            )}
                          </p>
                          {formatGroupName(item.clientWhatsappGroupName) ? (
                            <p className="text-slate-400">
                              {formatGroupName(item.clientWhatsappGroupName)}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="rounded-[24px] border border-slate-200 bg-white px-4 py-4 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.45)]">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          {item.schedule.active ? "Próximo evento" : "Última execução"}
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
                                Última tentativa:{" "}
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
                        <p className="font-semibold">Último erro</p>
                        <p className="mt-1 leading-6">{item.lastSendError}</p>
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          if (client) {
                            onSelectClient(client)
                          }
                        }}
                        data-cy="report-schedule-open-client"
                        disabled={!client}
                        className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        Abrir cliente
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setEditingItem(item)
                        }}
                        data-cy="report-schedule-edit"
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDelete(item)
                        }}
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

      {detailsItem ? (
        <ScheduleDetailsModal
          item={detailsItem}
          client={detailsClient}
          onClose={() => setDetailsItem(null)}
          onOpenClient={() => {
            if (detailsClient) {
              onSelectClient(detailsClient)
              setDetailsItem(null)
            }
          }}
          onEdit={() => {
            setEditingItem(detailsItem)
            setDetailsItem(null)
          }}
          onDelete={() => {
            void handleDelete(detailsItem)
            setDetailsItem(null)
          }}
        />
      ) : null}

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
              `Agendamento de ${editingItem?.clientName ?? "cliente"} atualizado. Próximo envio em ${new Date(savedSchedule.nextRunAt).toLocaleString("pt-BR")}.`
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
