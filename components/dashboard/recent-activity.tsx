import Link from "next/link"
import {
  DashboardActivityStatus,
  DashboardRecentActivityItem,
} from "@/lib/dashboard"

const colors = [
  "bg-red-700",
  "bg-red-600",
  "bg-rose-600",
  "bg-rose-500",
  "bg-pink-600",
  "bg-[#C1121F]",
]

function getColor(name: string) {
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getStatusClasses(status: DashboardActivityStatus) {
  if (status === "Enviado") {
    return "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-[var(--color-dashboard-accent)]"
  }

  if (status === "Falha") {
    return "border-[color:var(--color-app-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-muted)]"
  }

  if (status === "Conectado") {
    return "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-[var(--color-dashboard-accent)]"
  }

  return "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-muted)]"
}

interface RecentActivityProps {
  activities: DashboardRecentActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="dashboard-panel h-full rounded-[30px] border px-7 py-6">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[color:var(--color-dashboard-accent-border)] pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Últimos eventos
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-[color:var(--color-app-text)]">
            Atividade recente
          </h2>
        </div>
        <Link href="/dashboard/reports" className="dashboard-link text-sm font-medium transition hover:opacity-70">
          Ver tudo
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-center">
          <div className="max-w-[240px] space-y-2">
            <p className="text-sm font-medium text-[color:var(--color-app-text-muted)]">
              Nenhuma atividade real encontrada
            </p>
            <p className="text-xs leading-6 text-[color:var(--color-app-text-faint)]">
              Clientes conectados e relatórios salvos vão aparecer aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((item, index) => (
            <article
              key={item.id}
              className={`flex items-center gap-4 py-4 ${
                index !== activities.length - 1
                  ? "border-b border-[color:var(--color-dashboard-accent-border)]"
                  : ""
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getColor(
                  item.name
                )}`}
              >
                {getInitials(item.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[color:var(--color-app-text)]">
                  {item.name}
                </p>
                <p className="mt-1 truncate text-xs tracking-[0.01em] text-[color:var(--color-app-text-faint)]">
                  {item.campaign}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${getStatusClasses(
                    item.status
                  )}`}
                >
                  {item.status}
                </span>
                <p className="mt-2 text-xs text-[color:var(--color-app-text-faint)]">
                  {item.time}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
