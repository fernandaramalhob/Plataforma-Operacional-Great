"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Search, Download, Plus, Loader2 } from "lucide-react"
import Link from "next/link"

interface Client {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: string
  createdAt: string
  metaIntegration: { adAccountId: string | null } | null
  campaigns: { id: string }[]
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
}

const colors = [
  "bg-blue-500", "bg-purple-500", "bg-green-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
]

function getColor(name: string) {
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => {
        setClients(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => {
        setClients([])
        setLoading(false)
      })
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.company ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header
        title="Clientes"
        subtitle={`${clients.length} clientes cadastrados`}
      />
      <div className="p-8">

        {/* Top bar */}
        <div className="flex justify-end mb-6">
          <Link
            href="/dashboard/clients/new"
            className="flex items-center gap-2 bg-[#1AABDB] hover:bg-[#1594bf] text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar por nome ou empresa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB] focus:border-transparent"
              />
            </div>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1AABDB]">
              <option>Status: Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
            </select>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1AABDB]">
              <option>Integração META: Todos</option>
              <option>Conectado</option>
              <option>Desconectado</option>
            </select>
            <button className="flex items-center gap-2 text-[#1AABDB] text-sm font-medium hover:underline ml-auto">
              <Download className="w-4 h-4" />
              Exportar CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-[#1AABDB]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <p className="text-lg font-medium">Nenhum cliente encontrado</p>
              <p className="text-sm mt-1">Adicione seu primeiro cliente clicando em "+ Novo Cliente"</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="w-10 px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Empresa</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Status META</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Campanhas</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Cadastrado em</th>
                  <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((client) => (
                  <tr key={client.id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-4">
                      <input type="checkbox" className="rounded" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(client.name)}`}>
                          <span className="text-white text-xs font-semibold">{getInitials(client.name)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                          <p className="text-xs text-gray-400">{client.email ?? "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{client.company ?? "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${client.metaIntegration
                          ? "bg-green-50 text-green-600"
                          : "bg-gray-100 text-gray-400"
                        }`}>
                        {client.metaIntegration ? "Conectado" : "Não conectado"}
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
                          className="text-[#1AABDB] hover:underline text-sm font-medium"
                        >
                          Ver
                        </Link>
                        <Link
                          href={`/dashboard/clients/${client.id}/edit`}
                          className="text-gray-400 hover:text-gray-600 text-sm"
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