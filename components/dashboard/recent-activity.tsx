import Link from "next/link"
import { DashboardActivityStatus, DashboardRecentActivityItem } from "@/lib/dashboard"

const colors = [
  "bg-[#df2531]",
  "bg-[#ef4444]",
  "bg-[#b91c1c]",
  "bg-[#dc2626]",
  "bg-[#fb7185]",
  "bg-[#ef4444]",
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
    return "border-[#f3d3d6] bg-[#fff5f6] text-[#ef4444]"
  }

  if (status === "Falha") {
    return "border-[#e5e7eb] bg-[#f8fafc] text-[#6b7280]"
  }

  if (status === "Conectado") {
    return "border-[#f3d3d6] bg-[#fff5f6] text-[#ef4444]"
  }

  return "border-[#e5e7eb] bg-[#f8fafc] text-[#6b7280]"
}

interface RecentActivityProps {
  activities: DashboardRecentActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <section className="h-full rounded-[32px] border border-[#e5e7eb] bg-white px-7 py-6 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#eef0f3] pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
            Últimos eventos
          </p>
          <h2 className="mt-2 text-[32px] leading-none tracking-[-0.05em] text-[#111827]">
            Atividade recente
          </h2>
        </div>
        <Link href="/dashboard/reports" className="text-sm font-medium text-[#ef4444] transition hover:opacity-70">
          Ver tudo
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-center">
          <div className="max-w-[240px] space-y-2">
            <p className="text-sm font-medium text-[#374151]">
              Nenhuma atividade real encontrada
            </p>
            <p className="text-xs leading-6 text-[#9ca3af]">
              Clientes conectados e relatórios salvos vão aparecer aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {activities.map((item, index) => (
            <article
              key={item.id}
              className={`flex items-center gap-4 py-4 ${index !== activities.length - 1 ? "border-b border-[#eef0f3]" : ""}`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getColor(
                  item.name
                )}`}
              >
                {getInitials(item.name)}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#111827]">
                  {item.name}
                </p>
                <p className="mt-1 truncate text-xs tracking-[0.01em] text-[#9ca3af]">
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
                <p className="mt-2 text-xs text-[#9ca3af]">
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
