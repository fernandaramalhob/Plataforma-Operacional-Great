"use client"

import { Header } from "@/components/layout/header"
import { Search, Download, Plus } from "lucide-react"
import Link from "next/link"

const clients = [
  {
    name: "Ana Beatriz",
    initials: "AB",
    email: "ana@loja.com.br",
    company: "Loja ModaFit",
    status: "Ativo",
    campaigns: 4,
    lastSend: "03/03/2025 · 10:02",
    nextSend: "10/03/2025",
    color: "bg-blue-500",
  },
  {
    name: "Carlos Mendes",
    initials: "CM",
    email: "carlos@clinica.com.br",
    company: "Clínica Sorrisos",
    status: "Token Expirado",
    campaigns: 2,
    lastSend: "17/02/2025 · 10:08",
    nextSend: "—",
    color: "bg-purple-500",
  },
  {
    name: "Daniela Souza",
    initials: "DS",
    email: "daniela@cosmeticos.com.br",
    company: "Beleza Natural",
    status: "Ativo",
    campaigns: 5,
    lastSend: "03/03/2025 · 10:01",
    nextSend: "10/03/2025",
    color: "bg-green-500",
  },
  {
    name: "Eduardo Lima",
    initials: "EL",
    email: "eduardo@academia.com.br",
    company: "FitPro Academia",
    status: "Ativo",
    campaigns: 3,
    lastSend: "03/03/2025 · 10:03",
    nextSend: "10/03/2025",
    color: "bg-orange-500",
  },
]

export default function ClientsPage() {
  return (
    <>
      <Header title="Clientes" subtitle="90 clientes cadastrados" />
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
                className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1AABDB] focus:border-transparent"
              />
            </div>
            <select className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#1AABDB]">
              <option>Status: Todos</option>
              <option>Ativo</option>
              <option>Inativo</option>
              <option>Token Expirado</option>
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
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Último Envio</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Próximo Envio</th>
                <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.name} className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-4">
                    <input type="checkbox" className="rounded" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${client.color}`}>
                        <span className="text-white text-xs font-semibold">{client.initials}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                        <p className="text-xs text-gray-400">{client.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{client.company}</td>
                  <td className="px-4 py-4">
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      client.status === "Ativo"
                        ? "bg-green-50 text-green-600"
                        : "bg-red-50 text-red-500"
                    }`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">{client.campaigns} campanhas</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{client.lastSend}</td>
                  <td className="px-4 py-4 text-sm text-gray-600">{client.nextSend}</td>
                  <td className="px-4 py-4">
                    <Link
                      href={`/dashboard/clients/${client.name}`}
                      className="text-[#1AABDB] hover:underline text-sm"
                    >
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </>
  )
}