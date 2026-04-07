import Link from "next/link"
import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react"
import { DashboardClientSendItem } from "@/lib/dashboard"

function getStatusClasses(status: DashboardClientSendItem["status"]) {
  if (status === "Enviado") {
    return {
      badge: "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-[var(--color-dashboard-accent)]",
      icon: CheckCircle2,
      iconClass: "text-[var(--color-dashboard-accent)]",
    }
  }

  if (status === "Falha") {
    return {
      badge: "border-[color:var(--color-app-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-muted)]",
      icon: XCircle,
      iconClass: "text-[var(--color-danger-text)]",
    }
  }

  if (status === "Pendente") {
    return {
      badge: "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-[var(--color-dashboard-accent)]",
      icon: Clock3,
      iconClass: "text-[var(--color-dashboard-accent)]",
    }
  }

  return {
    badge: "border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-soft)]",
    icon: Send,
    iconClass: "text-[var(--color-dashboard-accent)]",
  }
}

interface ClientSendStatusProps {
  items: DashboardClientSendItem[]
}

export function ClientSendStatus({ items }: ClientSendStatusProps) {
  return (
    <section className="dashboard-panel rounded-[30px] border px-7 py-6">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[color:var(--color-dashboard-accent-border)] pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Último envio por cliente
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-[color:var(--color-app-text)]">
            Status de entrega
          </h2>
        </div>
        <Link href="/dashboard/history" className="dashboard-link text-sm font-medium transition hover:opacity-70">
          Ver histórico
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-center">
          <div className="max-w-[260px]">
            <p className="text-sm font-medium text-[color:var(--color-app-text-muted)]">
              Nenhum envio registrado ainda
            </p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--color-app-text-faint)]">
              Assim que os primeiros relatórios forem enviados, o histórico por cliente aparece aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((item, index) => {
            const status = getStatusClasses(item.status)
            const Icon = status.icon

            return (
              <article
                key={item.id}
                className={`flex items-start justify-between gap-4 py-4 ${
                  index !== items.length - 1
                    ? "border-b border-[color:var(--color-dashboard-accent-border)]"
                    : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-app-text)]">
                      {item.name}
                    </p>
                    {item.company ? (
                      <span className="truncate text-xs text-[color:var(--color-app-text-faint)]">
                        {item.company}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[color:var(--color-app-text-soft)]">
                    <span>{item.time}</span>
                    <span>{item.referenceWeek ? `Ref. ${item.referenceWeek}` : "Sem referência"}</span>
                    <span>
                      {item.attempts > 0
                        ? `${item.attempts} tentativa(s)`
                        : "Nenhuma tentativa"}
                    </span>
                  </div>

                  {item.errorMessage ? (
                    <p className="mt-2 truncate text-xs text-[color:var(--color-app-text-soft)]">
                      {item.errorMessage}
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${status.badge}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${status.iconClass}`} />
                    {item.status}
                  </span>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
