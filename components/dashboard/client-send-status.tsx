import Link from "next/link"
import { CheckCircle2, Clock3, Send, XCircle } from "lucide-react"
import { DashboardClientSendItem } from "@/lib/dashboard"

function getStatusClasses(status: DashboardClientSendItem["status"]) {
  if (status === "Enviado") {
    return {
      badge: "border-[#f3d3d6] bg-[#fff5f6] text-[#ef4444]",
      icon: CheckCircle2,
      iconClass: "text-[#ef4444]",
    }
  }

  if (status === "Falha") {
    return {
      badge: "border-[#f3d3d6] bg-[#fff5f6] text-[#ef4444]",
      icon: XCircle,
      iconClass: "text-[#ef4444]",
    }
  }

  if (status === "Pendente") {
    return {
      badge: "border-[#e5e7eb] bg-[#f8fafc] text-[#6b7280]",
      icon: Clock3,
      iconClass: "text-[#6b7280]",
    }
  }

  return {
    badge: "border-[#e5e7eb] bg-[#f8fafc] text-[#6b7280]",
    icon: Send,
    iconClass: "text-[#6b7280]",
  }
}

interface ClientSendStatusProps {
  items: DashboardClientSendItem[]
}

export function ClientSendStatus({ items }: ClientSendStatusProps) {
  return (
    <section className="rounded-[32px] border border-[#e5e7eb] bg-white px-7 py-6 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#eef0f3] pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
            Último envio por cliente
          </p>
          <h2 className="mt-2 text-[32px] leading-none tracking-[-0.05em] text-[#111827]">
            Status de entrega
          </h2>
        </div>
        <Link href="/dashboard/history" className="text-sm font-medium text-[#ef4444] transition hover:opacity-70">
          Ver histórico
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex h-[260px] items-center justify-center rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] text-center">
          <div className="max-w-[260px]">
            <p className="text-sm font-medium text-[#374151]">
              Nenhum envio registrado ainda
            </p>
            <p className="mt-2 text-xs leading-6 text-[#9ca3af]">
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
                  index !== items.length - 1 ? "border-b border-[#eef0f3]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#111827]">
                      {item.name}
                    </p>
                    {item.company ? (
                      <span className="truncate text-xs text-[#9ca3af]">
                        {item.company}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6b7280]">
                    <span>{item.time}</span>
                    <span>{item.referenceWeek ? `Ref. ${item.referenceWeek}` : "Sem referência"}</span>
                    <span>
                      {item.attempts > 0
                        ? `${item.attempts} tentativa(s)`
                        : "Nenhuma tentativa"}
                    </span>
                  </div>

                  {item.errorMessage ? (
                    <p className="mt-2 truncate text-xs text-[#6b7280]">
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
