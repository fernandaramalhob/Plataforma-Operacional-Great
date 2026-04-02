import Link from "next/link"
import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react"
import { DashboardClientSendItem } from "@/lib/dashboard"

function getStatusClasses(status: DashboardClientSendItem["status"]) {
  if (status === "Enviado") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: CheckCircle2,
      iconClass: "text-emerald-500",
    }
  }

  if (status === "Falha") {
    return {
      badge: "border-red-200 bg-red-50 text-red-600",
      icon: XCircle,
      iconClass: "text-red-500",
    }
  }

  if (status === "Pendente") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      icon: Clock3,
      iconClass: "text-amber-500",
    }
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-600",
    icon: Send,
    iconClass: "text-slate-400",
  }
}

interface ClientSendStatusProps {
  items: DashboardClientSendItem[]
}

export function ClientSendStatus({ items }: ClientSendStatusProps) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white px-7 py-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Último envio por cliente
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-slate-950">
            Status de entrega
          </h2>
        </div>
        <Link
          href="/dashboard/history"
          className="text-sm font-medium text-[#C1121F] transition hover:opacity-70"
        >
          Ver histórico
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center">
          <div className="max-w-[260px]">
            <p className="text-sm font-medium text-slate-700">
              Nenhum envio registrado ainda
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-400">
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
                  index !== items.length - 1 ? "border-b border-slate-100" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.name}
                    </p>
                    {item.company ? (
                      <span className="truncate text-xs text-slate-400">
                        {item.company}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{item.time}</span>
                    <span>{item.referenceWeek ? `Ref. ${item.referenceWeek}` : "Sem referência"}</span>
                    <span>
                      {item.attempts > 0
                        ? `${item.attempts} tentativa(s)`
                        : "Nenhuma tentativa"}
                    </span>
                  </div>

                  {item.errorMessage ? (
                    <p className="mt-2 truncate text-xs text-red-400">
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
