import Link from "next/link"
import {
  DashboardActivityStatus,
  DashboardRecentActivityItem,
} from "@/lib/dashboard"

const colors = [
  "bg-slate-900",
  "bg-blue-600",
  "bg-emerald-600",
  "bg-rose-600",
  "bg-amber-500",
  "bg-cyan-600",
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
    return "border-emerald-200 bg-emerald-50 text-emerald-700"
  }

  if (status === "Falha") {
    return "border-red-200 bg-red-50 text-red-600"
  }

  if (status === "Conectado") {
    return "border-blue-200 bg-blue-50 text-blue-700"
  }

  return "border-amber-200 bg-amber-50 text-amber-700"
}

interface RecentActivityProps {
  activities: DashboardRecentActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="h-full rounded-[30px] border border-slate-200/80 bg-white px-7 py-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Últimos eventos
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-slate-950">
            Atividade recente
          </h2>
        </div>
        <Link
          href="/dashboard/reports"
          className="text-sm font-medium text-[#C1121F] transition hover:opacity-70"
        >
          Ver tudo
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-center">
          <div className="max-w-[240px] space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Nenhuma atividade real encontrada
            </p>
            <p className="text-xs leading-6 text-slate-400">
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
                index !== activities.length - 1 ? "border-b border-slate-100" : ""
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
                <p className="truncate text-sm font-medium text-slate-900">
                  {item.name}
                </p>
                <p className="mt-1 truncate text-xs tracking-[0.01em] text-slate-400">
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
                <p className="mt-2 text-xs text-slate-400">{item.time}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
