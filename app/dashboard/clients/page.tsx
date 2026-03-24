"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Download, Loader2, Plus, Search } from "lucide-react"

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  adAccountId: string | null
  campaigns: { id: string }[]
}

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getColor(name: string) {
  return colors[name.charCodeAt(0) % colors.length]
}

function buildClientsQueryString(
  search: string,
  statusFilter: string,
  metaFilter: string,
  format?: "csv"
) {
  const params = new URLSearchParams()

  if (search.trim()) {
    params.set("search", search.trim())
  }

  if (statusFilter !== "ALL") {
    params.set("status", statusFilter)
  }

  if (metaFilter !== "ALL") {
    params.set("metaStatus", metaFilter)
  }

  if (format) {
    params.set("format", format)
  }

  return params.toString()
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL")
  const [metaFilter, setMetaFilter] = useState("ALL")

  useEffect(() => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      const queryString = buildClientsQueryString(
        search,
        statusFilter,
        metaFilter
      )

      fetch(`/api/clients?${queryString}`, {
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          setClients(Array.isArray(data) ? (data as Client[]) : [])
          setLoading(false)
        })
        .catch((error: unknown) => {
          if (
            error instanceof DOMException &&
            error.name === "AbortError"
          ) {
            return
          }

          setClients([])
          setLoading(false)
        })
    }, 250)

    return () => {
      clearTimeout(timeoutId)
      controller.abort()
    }
  }, [metaFilter, search, statusFilter])

  async function handleExportCsv() {
    setExporting(true)

    try {
      const queryString = buildClientsQueryString(
        search,
        statusFilter,
        metaFilter,
        "csv"
      )
      const response = await fetch(`/api/clients?${queryString}`, {
        method: "GET",
      })

      if (!response.ok) {
        throw new Error("Erro ao exportar CSV")
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      const dateStamp = new Date().toISOString().slice(0, 10)

      link.href = downloadUrl
      link.download = `clientes-${dateStamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch {
      window.alert("Nao foi possivel exportar a listagem em CSV.")
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <Header
        title="Clientes"
        subtitle={`${clients.length} clientes encontrados`}
      />
      <div className="p-8">
        <div className="mb-6 flex justify-end">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Link>
        </div>

        <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou empresa..."
                value={search}
                onChange={(event) => {
                  setLoading(true)
                  setSearch(event.target.value)
                }}
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(event) => {
                setLoading(true)
                setStatusFilter(event.target.value)
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            >
              <option value="ALL">Status: Todos</option>
              <option value="ACTIVE">Ativo</option>
              <option value="INACTIVE">Inativo</option>
            </select>
            <select
              value={metaFilter}
              onChange={(event) => {
                setLoading(true)
                setMetaFilter(event.target.value)
              }}
              className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
            >
              <option value="ALL">Integracao META: Todos</option>
              <option value="CONNECTED">Conectado</option>
              <option value="DISCONNECTED">Desconectado</option>
            </select>
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting || loading}
              className="ml-auto flex items-center gap-2 text-sm font-medium text-[#C1121F] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              <p className="mt-1 text-sm">
                Ajuste os filtros ou adicione um novo cliente.
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Empresa
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status META
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Campanhas
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cadastrado em
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Acoes
                  </th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    className="border-b border-gray-50 transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${getColor(client.name)}`}
                        >
                          <span className="text-xs font-semibold text-white">
                            {getInitials(client.name)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {client.name}
                          </p>
                          <p className="text-xs text-gray-400">
                            {client.email ?? "-"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {client.company ?? "-"}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          client.adAccountId
                            ? "bg-green-50 text-green-600"
                            : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {client.adAccountId ? "Conectado" : "Nao conectado"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {client.campaigns.length} campanhas
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {new Date(client.createdAt).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="text-sm font-medium text-[#C1121F] hover:underline"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}/edit`}
                          className="text-sm text-gray-400 hover:text-gray-600"
                        >
                          Editar
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
