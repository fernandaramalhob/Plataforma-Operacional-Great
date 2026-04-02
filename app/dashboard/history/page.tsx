"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { FilterSearchInput, FilterSelect } from "@/components/ui/filter-controls"
import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { StatusBadge } from "@/components/shared/status-badge"
import { fetchJsonOrThrow } from "@/lib/api-client"
import type { ClientLookupOption } from "@/types/client.types"
import type { HistoryRow, ReportSendResponse } from "@/types/report.types"
import {
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react"

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getColor(name: string): string {
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function statusLabel(status: string): string {
  if (status === "SENT") return "Enviado"
  if (status === "FAILED") return "Falha"
  return "Pendente"
}

function statusTone(status: string) {
  if (status === "SENT") return "success" as const
  if (status === "FAILED") return "danger" as const
  return "neutral" as const
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [clients, setClients] = useState<ClientLookupOption[]>([])
  const [loading, setLoading] = useState(true)
  const [retryingReportId, setRetryingReportId] = useState<string | null>(null)
  const [actionFeedback, setActionFeedback] = useState("")
  const [actionError, setActionError] = useState("")
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [clientFilter, setClientFilter] = useState("Todos os clientes")
  const [search, setSearch] = useState("")

  useEffect(() => {
    void fetchJsonOrThrow<ClientLookupOption[]>(
      "/api/clients",
      undefined,
      "Erro ao carregar clientes"
    )
      .then((data) => setClients(data))
      .catch(() => {})
  }, [])

  const loadHistory = useCallback(async () => {
    const params = new URLSearchParams()

    if (statusFilter !== "Todos") {
      params.set("status", statusFilter)
    }

    if (clientFilter !== "Todos os clientes") {
      const client = clients.find((item) => item.name === clientFilter)

      if (client) {
        params.set("clientId", client.id)
      }
    }

    setLoading(true)

    try {
      const data = await fetchJsonOrThrow<HistoryRow[]>(
        `/api/history?${params.toString()}`,
        undefined,
        "Erro ao carregar histórico"
      )

      setHistory(data)
    } catch {
      setHistory([])
    } finally {
      setLoading(false)
    }
  }, [clientFilter, clients, statusFilter])

  useEffect(() => {
    void loadHistory()
  }, [loadHistory])

  const filtered = history.filter(
    (item) =>
      item.client.toLowerCase().includes(search.toLowerCase()) ||
      item.company.toLowerCase().includes(search.toLowerCase())
  )

  const totalEnviados = filtered.filter((item) => item.status === "SENT").length
  const totalFalhas = filtered.filter((item) => item.status === "FAILED").length
  const totalPendentes = filtered.filter((item) => item.status === "PENDING").length

  function exportCSV() {
    const headers = ["Data", "Hora", "Cliente", "Empresa", "Status", "Tentativas"]
    const rows = filtered.map((item) => [
      item.date,
      item.time,
      item.client,
      item.company,
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
      await loadHistory()
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

  return (
    <div>
      <Header
        title="Histórico de Relatórios"
        subtitle={`${totalEnviados} relatórios enviados · últimos 30 dias`}
      />
      <div className="p-8">
        {actionFeedback ? (
          <div className="mb-4 rounded-2xl border border-green-100 bg-green-50 px-4 py-3 text-sm text-green-700">
            {actionFeedback}
          </div>
        ) : null}

        {actionError ? (
          <ErrorState
            message={actionError}
            title="Falha ao reenviar"
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
              onChange={(value) => {
                setLoading(true)
                setClientFilter(value)
              }}
              className="min-w-[220px]"
              options={[
                { value: "Todos os clientes", label: "Todos os clientes" },
                ...clients.map((client) => ({
                  value: client.name,
                  label: client.name,
                })),
              ]}
            />

            <div className="flex items-center gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
              {["Todos", "Enviado", "Falha", "Pendente"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setLoading(true)
                    setStatusFilter(status)
                  }}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                    statusFilter === status
                      ? "bg-white text-slate-900 shadow-[0_8px_20px_-16px_rgba(15,23,42,0.65)]"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status}
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
          </div>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-4">
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
                    Data e Hora
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Per?odo de ref.
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
                      row.status === "FAILED"
                        ? "bg-red-50/40 hover:bg-red-50"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{row.date}</p>
                      <p className="text-xs text-gray-400">{row.time}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${getColor(row.client)}`}
                        >
                          <span className="text-xs font-semibold text-white">
                            {getInitials(row.client)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {row.client}
                          </p>
                          <p className="text-xs text-gray-400">{row.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {row.referenceWeek}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {row.status === "SENT" ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : null}
                        {row.status === "FAILED" ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : null}
                        {row.status === "PENDING" ? (
                          <Clock className="h-4 w-4 text-gray-400" />
                        ) : null}
                        <StatusBadge tone={statusTone(row.status)}>
                          {statusLabel(row.status)}
                        </StatusBadge>
                      </div>
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
                        {row.attempts}{" "}
                        {row.attempts === 1 ? "tentativa" : "tentativas"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/reports/${row.id}`}
                          className="text-sm font-medium text-[#C1121F] hover:underline"
                        >
                          Ver
                        </Link>
                        {row.status === "FAILED" ? (
                          <button
                            onClick={() => void handleRetryReport(row.id)}
                            disabled={retryingReportId === row.id}
                            className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                          >
                            {retryingReportId === row.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : null}
                            {retryingReportId === row.id
                              ? "Reenviando..."
                              : "Reenviar"}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
