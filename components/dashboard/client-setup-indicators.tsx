import Link from "next/link"
import { AlertTriangle, CheckCircle2, MessageCircleMore, ShieldAlert } from "lucide-react"
import { DashboardConfigIndicators } from "@/lib/dashboard"

interface ClientSetupIndicatorsProps {
  data: DashboardConfigIndicators
}

export function ClientSetupIndicators({ data }: ClientSetupIndicatorsProps) {
  return (
    <section className="rounded-[30px] border border-slate-200/80 bg-white px-7 py-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Configuracao operacional
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-slate-950">
            Clientes prontos para envio
          </h2>
        </div>
        <Link
          href="/dashboard/settings"
          className="text-sm font-medium text-[#C1121F] transition hover:opacity-70"
        >
          Abrir configuracoes
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Prontos
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-emerald-800">
            {data.readyClients}
          </p>
          <p className="mt-1 text-xs text-emerald-700">
            de {data.totalClients} cliente(s) ativos
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Sem token
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-amber-800">
            {data.withoutMetaToken}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            precisam de token META
          </p>
        </div>

        <div className="rounded-[24px] border border-rose-200 bg-rose-50 px-4 py-4">
          <div className="flex items-center gap-2">
            <MessageCircleMore className="h-4 w-4 text-rose-500" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-700">
              Sem grupo
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-rose-800">
            {data.withoutWhatsappGroup}
          </p>
          <p className="mt-1 text-xs text-rose-700">
            faltam configurar WhatsApp
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <p className="text-sm font-medium text-slate-700">
            Clientes com pendencias
          </p>
        </div>

        {data.clients.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center rounded-[24px] border border-dashed border-slate-200 bg-slate-50/70 text-center">
            <div className="max-w-[240px]">
              <p className="text-sm font-medium text-slate-700">
                Nenhuma pendencia encontrada
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-400">
                Todos os clientes ativos exibidos aqui ja possuem token e grupo configurados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.clients.map((client) => (
              <article
                key={client.id}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {client.name}
                    </p>
                    {client.company ? (
                      <p className="mt-1 text-xs text-slate-400">{client.company}</p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/clients/${client.id}/edit`}
                    className="shrink-0 text-xs font-semibold text-[#C1121F] transition hover:opacity-70"
                  >
                    Corrigir
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.issues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700"
                    >
                      {issue}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
