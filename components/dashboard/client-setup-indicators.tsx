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
    <section className="rounded-[32px] border border-[#e5e7eb] bg-white px-7 py-6 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
      <div className="mb-6 flex items-end justify-between gap-4 border-b border-[#eef0f3] pb-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
            Configuração operacional
          </p>
          <h2 className="mt-2 text-[32px] leading-none tracking-[-0.05em] text-[#111827]">
            Clientes prontos para envio
          </h2>
        </div>
        <Link href="/dashboard/settings" className="text-sm font-medium text-[#ef4444] transition hover:opacity-70">
          Abrir configurações
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[28px] border border-[#f3d3d6] bg-[#fff5f6] px-4 py-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-[#ef4444]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#ef4444]">
              Prontos
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">
            {data.readyClients}
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            de {data.totalClients} cliente(s) ativos
          </p>
        </div>

        <div className="rounded-[28px] border border-[#e5e7eb] bg-white px-4 py-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-[#ef4444]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#374151]">
              Sem token
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">
            {data.withoutMetaToken}
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            precisam de token META
          </p>
        </div>

        <div className="rounded-[28px] border border-[#f3d3d6] bg-[#fff5f6] px-4 py-4">
          <div className="flex items-center gap-2">
            <MessageCircleMore className="h-4 w-4 text-[#ef4444]" />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#374151]">
              Sem grupo
            </p>
          </div>
          <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[#111827]">
            {data.withoutWhatsappGroup}
          </p>
          <p className="mt-1 text-xs text-[#6b7280]">
            faltam configurar WhatsApp
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[#ef4444]" />
          <p className="text-sm font-medium text-[#374151]">
            Clientes com pendências
          </p>
        </div>

        {data.clients.length === 0 ? (
          <div className="flex min-h-[210px] items-center justify-center rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] text-center">
            <div className="max-w-[240px]">
              <p className="text-sm font-medium text-[#374151]">
                Nenhuma pendência encontrada
              </p>
              <p className="mt-2 text-xs leading-6 text-[#9ca3af]">
                Todos os clientes ativos exibidos aqui já possuem token e grupo configurados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {data.clients.map((client) => (
              <article
                key={client.id}
                className="rounded-[22px] border border-[#e5e7eb] bg-white px-4 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#111827]">
                      {client.name}
                    </p>
                    {client.company ? (
                      <p className="mt-1 text-xs text-[#9ca3af]">
                        {client.company}
                      </p>
                    ) : null}
                  </div>
                  <Link
                    href={`/dashboard/clients/${client.id}/edit`}
                    className="shrink-0 text-xs font-semibold text-[#ef4444] transition hover:opacity-70"
                  >
                    Corrigir
                  </Link>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {client.issues.map((issue) => (
                    <span
                      key={issue}
                      className="rounded-full border border-[#e5e7eb] bg-[#f8fafc] px-2.5 py-1 text-[11px] font-medium text-[#374151]"
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
