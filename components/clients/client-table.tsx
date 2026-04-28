import Link from "next/link"
import { Loader2, Trash2 } from "lucide-react"
import { StatusBadge } from "@/components/shared/status-badge"
import type { ClientListItem } from "@/types/client.types"

const colors = [
  "bg-red-500",
  "bg-red-600",
  "bg-rose-500",
  "bg-rose-600",
  "bg-pink-600",
  "bg-[#C1121F]",
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
        <tr className="border-b border-[color:var(--color-app-border)]">
          <th className="w-10 px-4 py-4">
            <input type="checkbox" className="rounded border-[color:var(--color-app-border)]" />
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Cliente
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Empresa
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Status META
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Campanhas
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Cadastrado em
          </th>
          <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Ações
          </th>
        </tr>
      </thead>
      <tbody>
        {clients.map((client) => (
          <tr
            key={client.id}
            className="border-b border-[color:var(--color-app-border)]/70 transition hover:bg-[var(--color-app-surface-muted)]"
          >
            <td className="px-4 py-4">
              <input type="checkbox" className="rounded border-[color:var(--color-app-border)]" />
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
                  <p className="text-sm font-semibold text-[color:var(--color-app-text)]">
                    {client.name}
                  </p>
                  <p className="text-xs text-[color:var(--color-app-text-soft)]">{client.email ?? "-"}</p>
                </div>
              </div>
            </td>
            <td className="px-4 py-4 text-sm text-[color:var(--color-app-text-soft)]">
              {client.company ?? "-"}
            </td>
            <td className="px-4 py-4">
              <StatusBadge tone={client.adAccountId ? "success" : "neutral"}>
                {client.adAccountId ? "Conectado" : "Não conectado"}
              </StatusBadge>
            </td>
            <td className="px-4 py-4 text-sm text-[color:var(--color-app-text-soft)]">
              <span className="whitespace-nowrap">
                {client.campaigns.length} campanhas
              </span>
            </td>
            <td className="px-4 py-4 text-sm text-[color:var(--color-app-text-soft)]">
              {new Date(client.createdAt).toLocaleDateString("pt-BR")}
            </td>
            <td className="px-4 py-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/clients/${client.id}`}
                  className="text-sm font-medium text-[#df2531] hover:underline"
                >
                  Ver
                </Link>

                <button
                  type="button"
                  onClick={() => onDeleteClient?.(client)}
                  disabled={deletingClientId === client.id}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--color-app-text-faint)] transition hover:bg-[rgba(223,37,49,0.08)] hover:text-[#df2531] disabled:cursor-not-allowed disabled:opacity-60"
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
