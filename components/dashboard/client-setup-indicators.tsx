import Link from "next/link"
import {
  AlertTriangle,
  CheckCircle2,
  MessageCircleMore,
  ShieldAlert,
} from "lucide-react"
import { DashboardConfigIndicators } from "@/lib/dashboard"

interface ClientSetupIndicatorsProps {
  data: DashboardConfigIndicators
}

export function ClientSetupIndicators({ data }: ClientSetupIndicatorsProps) {
  return (
    <section className="dashboard-panel rounded-[30px] border px-7 py-6">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[color:var(--color-dashboard-accent-border)] pb-5">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Configuração operacional
          </p>
          <h2 className="mt-2 text-[30px] leading-none tracking-[-0.04em] text-[color:var(--color-app-text)]">
            Clientes prontos para envio
          </h2>
        </div>
        <Link href="/dashboard/settings" className="dashboard-link text-sm font-medium transition hover:opacity-70">
          Abrir configurações
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[24px] border border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] px-4 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[var(--color-dashboard-accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-dashboard-accent)]">
              Prontos
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-app-text)]">
            {data.readyClients}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-app-text-soft)]">
            de {data.totalClients} cliente(s) ativos
          </p>
        </div>

        <div className="dashboard-panel-solid rounded-[24px] border px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[var(--color-dashboard-accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-app-text-muted)]">
              Sem token
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-app-text)]">
            {data.withoutMetaToken}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-app-text-soft)]">
            precisam de token META
          </p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] px-4 py-4">
          <div className="flex items-center gap-2">
            <MessageCircleMore className="h-4 w-4 text-[var(--color-dashboard-accent)]" />
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--color-app-text-muted)]">
              Sem grupo
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[color:var(--color-app-text)]">
            {data.withoutWhatsappGroup}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-app-text-soft)]">
            faltam configurar WhatsApp
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--color-dashboard-accent)]" />
          <p className="text-sm font-medium text-[color:var(--color-app-text-muted)]">
            Clientes com pendências
          </p>
        </div>

        {data.clients.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center rounded-[24px] border border-dashed border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-center">
            <div className="max-w-[240px]">
              <p className="text-sm font-medium text-[color:var(--color-app-text-muted)]">
                Nenhuma pendência encontrada
              </p>
              <p className="mt-2 text-xs leading-6 text-[color:var(--color-app-text-faint)]">
                Todos os clientes ativos exibidos aqui já possuem token e grupo configurados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.clients.map((client) => (
              <article
                key={client.id}
                className="dashboard-panel-solid rounded-[22px] border px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[color:var(--color-app-text)]">
                      {client.name}
                    </p>
                    {client.company ? (
                      <p className="mt-1 text-xs text-[color:var(--color-app-text-faint)]">
                        {client.company}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/clients/${client.id}/edit`}
                    className="dashboard-link shrink-0 text-xs font-semibold transition hover:opacity-70"
                  >
                    Corrigir
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.issues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full border border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-app-text-muted)]"
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
