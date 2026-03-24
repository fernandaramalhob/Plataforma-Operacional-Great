"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import type { HistoryRow } from "@/types/report.types"
import {
  Search,
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

function statusColor(status: string): string {
  if (status === "SENT") return "bg-green-50 text-green-600"
  if (status === "FAILED") return "bg-red-50 text-red-500"
  return "bg-gray-100 text-gray-500"
}

interface Client {
  id: string
  name: string
}

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryRow[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState("Todos")
  const [clientFilter, setClientFilter] = useState("Todos os clientes")
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setClients(data)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
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

    fetch(`/api/history?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setHistory(data)
        }

        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [clientFilter, clients, statusFilter])

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
    anchor.download = "historico-relatorios.csv"
    anchor.click()
  }

  return (
    <div>
      <Header
        title="Historico de Relatorios"
        subtitle={`${totalEnviados} relatorios enviados · ultimos 30 dias`}
      />
      <div className="p-8">
        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>

            <select
              value={clientFilter}
              onChange={(event) => {
                setLoading(true)
                setClientFilter(event.target.value)
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            >
              <option>Todos os clientes</option>
              {clients.map((client) => (
                <option key={client.id}>{client.name}</option>
              ))}
            </select>

            <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
              {["Todos", "Enviado", "Falha", "Pendente"].map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setLoading(true)
                    setStatusFilter(status)
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                    statusFilter === status
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
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
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="mt-1 text-sm">Tente ajustar os filtros</p>
            </div>
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
                    Periodo de Ref.
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Tentativas
                  </th>
                  <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Acoes
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
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(row.status)}`}
                        >
                          {statusLabel(row.status)}
                        </span>
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
                          <button className="text-sm font-medium text-orange-500 hover:underline">
                            Reenviar
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
