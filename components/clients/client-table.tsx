import Link from "next/link"
import { Loader2, Trash2 } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { ClientListItem } from "@/types/client.types"

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

type ClientTableProps = {
  clients: ClientListItem[]
  deletingClientId?: string | null
  onDeleteClient?: (client: ClientListItem) => void
}

export function ClientTable({
  clients,
  deletingClientId = null,
  onDeleteClient,
}: ClientTableProps) {
  return (
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
            Ações
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
                  <p className="text-xs text-gray-400">{client.email ?? "-"}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-4 text-sm text-gray-600">
              {client.company ?? "-"}
            </td>
            <td className="px-4 py-4">
              <StatusBadge tone={client.adAccountId ? "success" : "neutral"}>
                {client.adAccountId ? "Conectado" : "Não conectado"}
              </StatusBadge>
            </td>
            <td className="px-4 py-4 text-sm text-gray-600">
              <span className="whitespace-nowrap">
                {client.campaigns.length} campanhas
              </span>
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

                <button
                  type="button"
                  onClick={() => onDeleteClient?.(client)}
                  disabled={deletingClientId === client.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Excluir cliente ${client.name}`}
                  title="Excluir cliente"
                >
                  {deletingClientId === client.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
