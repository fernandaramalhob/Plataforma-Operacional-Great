"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { FilterSearchInput, FilterSelect } from "@/components/ui/filter-controls"
import { Download, Plus } from "lucide-react"
import { ClientTable } from "@/components/clients/client-table"
import { EmptyState } from "@/components/shared/empty-state"
import { LoadingSkeleton } from "@/components/shared/loading-skeleton"
import { fetchJsonOrThrow } from "@/lib/api-client"
import { formatLocalDateInput } from "@/lib/date-input"
import type { ClientListItem } from "@/types/client.types"

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
  const [clients, setClients] = useState<ClientListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [deletingClientId, setDeletingClientId] = useState<string | null>(null)
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

      void fetchJsonOrThrow<ClientListItem[]>(
        `/api/clients?${queryString}`,
        {
          signal: controller.signal,
        },
        "Erro ao carregar clientes"
      )
        .then((data) => {
          setClients(data)
          setLoading(false)
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") {
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
      const dateStamp = formatLocalDateInput(new Date())

      link.href = downloadUrl
      link.download = `clientes-${dateStamp}.csv`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(downloadUrl)
    } catch {
      window.alert("Não foi possível exportar a listagem em CSV.")
    } finally {
      setExporting(false)
    }
  }

  async function handleDeleteClient(client: ClientListItem) {
    const shouldDelete = window.confirm(
      `Tem certeza que deseja excluir o cliente "${client.name}"? Esta ação não pode ser desfeita.`
    )

    if (!shouldDelete) {
      return
    }

    setDeletingClientId(client.id)

    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: "DELETE",
      })
      const data = (await response.json().catch(() => null)) as
        | { error?: string; message?: string }
        | null

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível excluir o cliente.")
      }

      setClients((current) => current.filter((item) => item.id !== client.id))
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Não foi possível excluir o cliente."
      )
    } finally {
      setDeletingClientId(null)
    }
  }

  return (
    <>
      <Header
        title="Clientes"
        subtitle={`${clients.length} clientes encontrados`}
      />
      <div className="px-8 pb-8 pt-24">
        <div className="mb-6 flex justify-end">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 rounded-xl bg-[#C1121F] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
          >
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Link>
        </div>

        <div className="mb-4 rounded-[28px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
          <div className="flex flex-wrap items-center gap-3">
            <FilterSearchInput
              type="text"
              placeholder="Buscar por nome ou empresa..."
              value={search}
              onChange={(event) => {
                setLoading(true)
                setSearch(event.target.value)
              }}
            />
            <FilterSelect
              value={statusFilter}
              onChange={(value) => {
                setLoading(true)
                setStatusFilter(value)
              }}
              className="min-w-[190px]"
              options={[
                { value: "ALL", label: "Status: Todos" },
                { value: "ACTIVE", label: "Ativo" },
                { value: "INACTIVE", label: "Inativo" },
              ]}
            />
            <FilterSelect
              value={metaFilter}
              onChange={(value) => {
                setLoading(true)
                setMetaFilter(value)
              }}
              className="min-w-[220px]"
              options={[
                { value: "ALL", label: "Integração META: Todos" },
                { value: "CONNECTED", label: "Conectado" },
                { value: "DISCONNECTED", label: "Desconectado" },
              ]}
            />
            <button
              type="button"
              onClick={() => void handleExportCsv()}
              disabled={exporting || loading}
              className="ml-auto inline-flex items-center gap-2 rounded-2xl border border-[#C1121F]/15 bg-[#FFF5F6] px-4 py-3 text-sm font-semibold text-[#C1121F] transition hover:border-[#C1121F]/30 hover:bg-[#FDEBEC] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Exportando..." : "Exportar CSV"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {loading ? (
            <LoadingSkeleton label="Carregando clientes..." />
          ) : clients.length === 0 ? (
            <EmptyState
              title="Nenhum cliente encontrado"
              description="Ajuste os filtros atuais ou cadastre um novo cliente para começar."
              className="m-6 border-none px-4 py-20"
            />
          ) : (
            <ClientTable
              clients={clients}
              deletingClientId={deletingClientId}
              onDeleteClient={handleDeleteClient}
            />
          )}
        </div>
      </div>
    </>
  )
}
