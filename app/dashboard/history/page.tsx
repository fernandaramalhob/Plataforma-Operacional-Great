"use client"

import Link from "next/link"
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react"
import {
  CheckCircle,
  Clock,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react"
import { Header } from "@/components/layout/header"
import { FilterSearchInput, FilterSelect } from "@/components/ui/filter-controls"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { BulkReportResendModal } from "@/components/reports/bulk-resend-modal"
import { fetchJsonOrThrow } from "@/lib/api-client"
import { cancelQueuedReport } from "@/lib/report-client"
import type { ClientLookupOption } from "@/types/client.types"
import type {
  HistoryRow,
  ReportSendResponse,
  ReportStatusValue,
} from "@/types/report.types"

type HistoryStatusFilter = "ALL" | ReportStatusValue

const HISTORY_STATUS_OPTIONS: Array<{
  label: string
  value: HistoryStatusFilter
}> = [
  { label: "Todos", value: "ALL" },
  { label: "Enviado", value: "SENT" },
  { label: "Falha", value: "FAILED" },
  { label: "Cancelado", value: "CANCELLED" },
  { label: "Pendente", value: "PENDING" },
]

function statusLabel(status: string): string {
  if (status === "SENT") return "Enviado"
  if (status === "FAILED") return "Falha"
  if (status === "CANCELLED") return "Cancelado"
  return "Pendente"
}

function statusTone(status: string) {
  if (status === "SENT") return "success" as const
  if (status === "FAILED") return "danger" as const
  if (status === "CANCELLED") return "warning" as const
  return "neutral" as const
}

function formatDateTime(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

function isPastDue(value: string | null) {
  if (!value) {
    return false
  }

  const date = new Date(value)

  return !Number.isNaN(date.getTime()) && date.getTime() <= Date.now()
}

function isEligibleForBulkResend(row: HistoryRow) {
  return row.status === "PENDING" && isPastDue(row.nextSendAt)
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [clients, setClients] = useState<ClientLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [retryingReportId, setRetryingReportId] = useState<string | null>(null)
  const [cancelingReportId, setCancelingReportId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState("")
  const [actionError, setActionError] = useState("")
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("ALL")
  const [clientFilter, setClientFilter] = useState("Todos os clientes")
  const [search, setSearch] = useState("")
  const [selectedReportIds, setSelectedReportIds] = useState<string[]>([])
  const [bulkResendOpen, setBulkResendOpen] = useState(false)
  const deferredSearch = useDeferredValue(search)

  useEffect(() => {
    void fetchJsonOrThrow<ClientLookupOption[]>(
      "/api/clients",
      undefined,
      "Erro ao carregar clientes"
    )
      .then((data) => setClients(data))
      .catch(() => {})
  }, [])

  const loadHistory = useCallback(async (options?: { silent?: boolean }) => {
    if (options?.silent) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchJsonOrThrow<HistoryRow[]>(
        "/api/history",
        undefined,
        "Erro ao carregar histórico"
      )

      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const selectedClient = useMemo(
    () =>
      clientFilter === "Todos os clientes"
        ? null
        : clients.find((item) => item.name === clientFilter) ?? null,
    [clientFilter, clients]
  )

  const filtered = useMemo(() => {
    const normalizedSearch = deferredSearch.toLowerCase().trim()

    return history.filter((item) => {
      if (statusFilter !== "ALL" && item.status !== statusFilter) {
        return false
      }

      if (selectedClient && item.clientId !== selectedClient.id) {
        return false
      }

      if (!normalizedSearch) {
        return true
      }

      return (
        item.client.toLowerCase().includes(normalizedSearch) ||
        item.company.toLowerCase().includes(normalizedSearch) ||
        (item.groupId ?? "").toLowerCase().includes(normalizedSearch) ||
        (item.groupName ?? "").toLowerCase().includes(normalizedSearch)
      )
    })
  }, [deferredSearch, history, selectedClient, statusFilter])

  const totalEnviados = filtered.filter((item) => item.status === "SENT").length
  const totalFalhas = filtered.filter((item) => item.status === "FAILED").length
  const totalCancelados = filtered.filter(
    (item) => item.status === "CANCELLED"
  ).length
  const totalPendentes = filtered.filter((item) => item.status === "PENDING").length
  const eligibleBulkResendRows = filtered.filter(isEligibleForBulkResend)
  const selectedBulkResendRows = filtered.filter((row) =>
    selectedReportIds.includes(row.reportId ?? row.id)
  )
  const selectedBulkResendItems = selectedBulkResendRows.map((row) => ({
    id: row.reportId ?? row.id,
    source: row.source,
    clientId: row.clientId,
    label: row.client,
  }))
  const allEligibleSelected =
    eligibleBulkResendRows.length > 0 &&
    eligibleBulkResendRows.every((row) =>
      selectedReportIds.includes(row.reportId ?? row.id)
    )

  useEffect(() => {
    setSelectedReportIds((current) =>
      current.filter((reportId) =>
        filtered.some(
          (row) =>
            (row.reportId ?? row.id) === reportId && isEligibleForBulkResend(row)
        )
      )
    )
  }, [filtered])

  function exportCSV() {
    const headers = [
      "Origem",
      "Data",
      "Hora",
      "Cliente",
      "Empresa",
      "Grupo ID",
      "Grupo Nome",
      "Agendado Em",
      "Enviado Em",
      "Previsto Para",
      "Status",
      "Tentativas",
    ]
    const rows = filtered.map((item) => [
      item.source === "schedule" ? "Agendamento" : "Relatorio",
      item.date,
      item.time,
      item.client,
      item.company,
      item.groupId ?? "-",
      item.groupName ?? "-",
      item.scheduledAt ?? "-",
      item.sentAt ?? "-",
      item.nextSendAt ?? "-",
      item.status,
      item.attempts,
    ])
    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "histórico-relatórios.csv"
    anchor.click()
  }

  async function handleRetryReport(reportId: string) {
    setRetryingReportId(reportId)
    setActionFeedback("")
    setActionError("")

    try {
      await fetchJsonOrThrow<ReportSendResponse>(
        `/api/reports/${reportId}/send`,
        { method: "POST" },
        "Não foi possível reenviar o relatório"
      )

      setActionFeedback("Relatório reenviado com sucesso.")
      await loadHistory({ silent: true })
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível reenviar o relatório"
      )
    } finally {
      setRetryingReportId(null)
    }
  }

  async function handleCancelReport(reportId: string) {
    setCancelingReportId(reportId)
    setActionFeedback("")
    setActionError("")

    try {
      await cancelQueuedReport(reportId)
      setActionFeedback("Envio cancelado com sucesso.")
      await loadHistory({ silent: true })
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível cancelar o envio"
      )
    } finally {
      setCancelingReportId(null)
    }
  }

  async function handleRefreshHistory() {
    setActionFeedback("")
    setActionError("")
    await loadHistory({ silent: true })
  }

  function toggleBulkResendSelection(row: HistoryRow) {
    if (!isEligibleForBulkResend(row)) {
      return
    }

    const reportId = row.reportId ?? row.id

    setSelectedReportIds((current) =>
      current.includes(reportId)
        ? current.filter((id) => id !== reportId)
        : [...current, reportId]
    )
  }

  function toggleAllEligibleBulkResends() {
    setSelectedReportIds((current) => {
      if (allEligibleSelected) {
        return current.filter(
          (reportId) => !eligibleBulkResendRows.some((row) => (row.reportId ?? row.id) === reportId)
        )
      }

      const next = new Set(current)
      eligibleBulkResendRows.forEach((row) => {
        next.add(row.reportId ?? row.id)
      })

      return Array.from(next)
    })
  }

  return (
    <div>
      <Header
        title="Histórico de Relatórios"
        subtitle={`${totalEnviados} relatórios enviados · últimos 30 dias`}
      />
      <div className="px-8 pb-8 pt-24">
        {actionFeedback ? (
          <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionFeedback}
          </div>
        ) : null}

        {actionError ? (
          <ErrorState
            message={actionError}
            title="Falha na ação"
            className="mb-4"
          />
        ) : null}

        <div className="mb-4 rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSearchInput
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="max-w-[320px]"
            />

            <FilterSelect
              value={clientFilter}
              onChange={(value) => setClientFilter(value)}
              className="min-w-[220px]"
              options={[
                { value: "Todos os clientes", label: "Todos os clientes" },
                ...clients.map((client) => ({
                  value: client.name,
                  label: client.name,
                })),
              ]}
            />

            <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              {HISTORY_STATUS_OPTIONS.map((status) => (
                <button
                  key={status.value}
                  onClick={() => setStatusFilter(status.value)}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    statusFilter === status.value
                      ? "bg-white text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.65)]"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              className="ml-auto flex items-center gap-2 text-sm font-medium text-[#C1121F] hover:underline"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </button>

            <button
              type="button"
              onClick={toggleAllEligibleBulkResends}
              disabled={eligibleBulkResendRows.length === 0}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title={
                allEligibleSelected
                  ? "Desmarcar todos os pendentes vencidos"
                  : "Selecionar todos os pendentes vencidos"
              }
              aria-label={
                allEligibleSelected
                  ? "Desmarcar todos os pendentes vencidos"
                  : "Selecionar todos os pendentes vencidos"
              }
            >
              {allEligibleSelected ? "Desmarcar vencidos" : "Selecionar vencidos"}
            </button>

            <button
              type="button"
              onClick={() => setBulkResendOpen(true)}
              disabled={selectedBulkResendItems.length === 0}
              className="inline-flex items-center justify-center rounded-2xl bg-[#C1121F] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
            >
              Reenviar selecionados ({selectedBulkResendItems.length})
            </button>

            <button
              onClick={() => void handleRefreshHistory()}
              disabled={refreshing}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              title="Atualizar histórico"
              aria-label="Atualizar histórico"
            >
              {refreshing ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#C1121F]" />
              ) : (
                <RefreshCw className="h-4 w-4 text-[#C1121F]" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
          <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50 px-5 py-4">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-700">{totalEnviados}</p>
              <p className="text-sm text-green-600">Enviados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4">
            <XCircle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{totalFalhas}</p>
              <p className="text-sm text-red-600">Falhas</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4">
            <Clock className="h-5 w-5 text-amber-500" />
            <div>
              <p className="text-2xl font-bold text-amber-700">{totalCancelados}</p>
              <p className="text-sm text-amber-600">Cancelados</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-gray-700">{totalPendentes}</p>
              <p className="text-sm text-gray-500">Pendentes</p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <LoadingSkeleton label="Carregando histórico..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nenhum registro encontrado"
              description="Tente ajustar os filtros para encontrar outros relatórios."
              className="m-6 border-none px-4 py-20"
            />
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Seleção
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Data e Hora
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Grupo
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tentativas
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 transition ${
                      selectedReportIds.includes(row.reportId ?? row.id)
                        ? "bg-[#FFF5F6]"
                        : ""
                    } ${
                      row.status === "FAILED"
                        ? "bg-red-50/40 hover:bg-red-50"
                        : row.status === "CANCELLED"
                          ? "bg-amber-50/30 hover:bg-amber-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-5 py-4 align-top">
                      {isEligibleForBulkResend(row) ? (
                        <button
                          type="button"
                          aria-label={`Selecionar ${row.client}`}
                          aria-pressed={selectedReportIds.includes(row.reportId ?? row.id)}
                          onClick={() => toggleBulkResendSelection(row)}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold transition ${
                            selectedReportIds.includes(row.reportId ?? row.id)
                              ? "border-[#C1121F] bg-[#C1121F] text-white"
                              : "border-slate-300 bg-white text-transparent hover:border-[#C1121F]"
                          }`}
                        >
                          X
                        </button>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{row.date}</p>
                      <p className="text-xs text-gray-400">{row.time}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        {row.reportId ? (
                          <Link
                            href={`/dashboard/reports/${row.reportId}`}
                            className="text-sm font-semibold text-gray-900 transition hover:text-[#C1121F] hover:underline"
                          >
                            {row.client}
                          </Link>
                        ) : (
                          <Link
                            href={`/dashboard/clients/${row.clientId}`}
                            className="text-sm font-semibold text-gray-900 transition hover:text-[#C1121F] hover:underline"
                          >
                            {row.client}
                          </Link>
                        )}
                        <p className="text-xs text-gray-400">{row.company}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {row.groupId ?? "Grupo não informado"}
                        </p>
                        {row.groupName ? (
                          <p className="mt-1 text-xs text-gray-400">{row.groupName}</p>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {row.status === "SENT" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                        {row.status === "FAILED" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                        {row.status === "CANCELLED" ? (
                          <Clock className="h-4 w-4 text-amber-500" />
                        ) : null}
                        {row.status === "PENDING" ? (
                          <Clock className="h-4 w-4 text-gray-400" />
                        ) : null}
                        <StatusBadge tone={statusTone(row.status)}>
                          {statusLabel(row.status)}
                        </StatusBadge>
                      </div>
                      {row.referenceWeek ? (
                        <p className="mt-1 text-xs text-gray-400">{row.referenceWeek}</p>
                      ) : null}
                      {formatDateTime(row.scheduledAt) ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Agendado em {formatDateTime(row.scheduledAt)}
                        </p>
                      ) : null}
                      {row.status === "SENT" && formatDateTime(row.sentAt) ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Enviado em {formatDateTime(row.sentAt)}
                        </p>
                      ) : null}
                      {row.status !== "SENT" && formatDateTime(row.nextSendAt) ? (
                        <p className="mt-1 text-xs text-gray-400">
                          Envio previsto em {formatDateTime(row.nextSendAt)}
                        </p>
                      ) : null}
                      {row.errorMessage ? (
                        <p className="mt-1 max-w-[200px] truncate text-xs text-red-400">
                          {row.errorMessage}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`text-sm font-medium ${
                          row.attempts >= 3 ? "text-red-500" : "text-gray-600"
                        }`}
                      >
                        {row.attempts} {row.attempts === 1 ? "tentativa" : "tentativas"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {row.source === "report" ? (
                          <button
                            onClick={() => void handleCancelReport(row.reportId ?? row.id)}
                            disabled={
                              row.status !== "PENDING" ||
                              cancelingReportId === (row.reportId ?? row.id)
                            }
                            className={`inline-flex items-center gap-1 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              row.status === "PENDING"
                                ? "text-red-500 hover:underline"
                                : "text-gray-400"
                            }`}
                          >
                            {cancelingReportId === (row.reportId ?? row.id) ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {row.status === "CANCELLED"
                              ? "Cancelado"
                              : cancelingReportId === (row.reportId ?? row.id)
                                ? "Cancelando..."
                                : "Cancelar envio"}
                          </button>
                        ) : (
                          <span className="text-sm font-medium text-gray-400">
                            Agendado
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <BulkReportResendModal
          open={bulkResendOpen}
          items={selectedBulkResendItems}
          onClose={() => setBulkResendOpen(false)}
          onSaved={({ scheduledAt, succeeded, failed }) => {
            setBulkResendOpen(false)
            setSelectedReportIds([])
            setActionError("")
            setActionFeedback(
              failed > 0
                ? `${succeeded} relatórios reagendados para ${new Date(scheduledAt).toLocaleString("pt-BR")}. ${failed} falharam.`
                : `${succeeded} relatórios reagendados para ${new Date(scheduledAt).toLocaleString("pt-BR")}.`
            )
            void loadHistory({ silent: true })
          }}
        />
      </div>
    </div>
  )
}
