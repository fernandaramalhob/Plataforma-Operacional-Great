"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/layout/header"
import { Search, Download, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

const colors = ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500", "bg-pink-500", "bg-teal-500"]

function getColor(name: string): string {
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
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

interface HistoryRow {
  id: string
  date: string
  time: string
  clientId: string
  client: string
  company: string
  status: string
  attempts: number
  errorMessage: string | null
  referenceWeek: string
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
        if (Array.isArray(data)) setClients(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== "Todos") params.set("status", statusFilter)
    if (clientFilter !== "Todos os clientes") {
      const client = clients.find((c) => c.name === clientFilter)
      if (client) params.set("clientId", client.id)
    }
    fetch("/api/history?" + params.toString())
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [statusFilter, clientFilter, clients])

  const filtered = history.filter((h) =>
    h.client.toLowerCase().includes(search.toLowerCase()) ||
    h.company.toLowerCase().includes(search.toLowerCase())
  )

  const totalEnviados = filtered.filter((h) => h.status === "SENT").length
  const totalFalhas = filtered.filter((h) => h.status === "FAILED").length
  const totalPendentes = filtered.filter((h) => h.status === "PENDING").length

  function exportCSV() {
    const headers = ["Data", "Hora", "Cliente", "Empresa", "Status", "Tentativas"]
    const rows = filtered.map((h) => [h.date, h.time, h.client, h.company, h.status, h.attempts])
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "historico-relatorios.csv"
    a.click()
  }

  return (
    <div>
      <Header
        title="Histórico de Relatórios"
        subtitle={totalEnviados + " relatórios enviados · últimos 30 dias"}
      />
      <div className="p-8">

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>

            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            >
              <option>Todos os clientes</option>
              {clients.map((c) => (
                <option key={c.id}>{c.name}</option>
              ))}
            </select>

            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              {["Todos", "Enviado", "Falha", "Pendente"].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={"px-3 py-1.5 rounded-lg text-sm font-medium transition " + (statusFilter === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 text-[#C1121F] text-sm font-medium hover:underline ml-auto"
            >
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 border border-green-100 rounded-2xl px-5 py-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-green-700">{totalEnviados}</p>
              <p className="text-sm text-green-600">Enviados</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-100 rounded-2xl px-5 py-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-red-700">{totalFalhas}</p>
              <p className="text-sm text-red-600">Falhas</p>
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-2xl font-bold text-gray-700">{totalPendentes}</p>
              <p className="text-sm text-gray-500">Pendentes</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#C1121F]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-sm mt-1">Tente ajustar os filtros</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Data e Hora</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Semana de Ref.</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Tentativas</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr
                    key={row.id}
                    className={"border-b border-gray-50 transition " + (row.status === "FAILED" ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50")}
                  >
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium text-gray-900">{row.date}</p>
                      <p className="text-xs text-gray-400">{row.time}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={"w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 " + getColor(row.client)}>
                          <span className="text-white text-xs font-semibold">{getInitials(row.client)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{row.client}</p>
                          <p className="text-xs text-gray-400">{row.company}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{row.referenceWeek}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        {row.status === "SENT" && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {row.status === "FAILED" && <XCircle className="w-4 h-4 text-red-500" />}
                        {row.status === "PENDING" && <Clock className="w-4 h-4 text-gray-400" />}
                        <span className={"text-xs font-semibold px-2.5 py-1 rounded-full " + statusColor(row.status)}>
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      {row.errorMessage && (
                        <p className="text-xs text-red-400 mt-1 max-w-[200px] truncate">{row.errorMessage}</p>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={"text-sm font-medium " + (row.attempts >= 3 ? "text-red-500" : "text-gray-600")}>
                        {row.attempts} {row.attempts === 1 ? "tentativa" : "tentativas"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button className="text-[#C1121F] hover:underline text-sm font-medium">Ver</button>
                        {row.status === "FAILED" && (
                          <button className="text-orange-500 hover:underline text-sm font-medium">Reenviar</button>
                        )}
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