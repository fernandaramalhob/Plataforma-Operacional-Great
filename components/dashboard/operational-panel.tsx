import Link from "next/link"
import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react"
import {
  DashboardOperationalAlertItem,
  DashboardOperationalPanel as DashboardOperationalPanelData,
  DashboardTone,
} from "@/lib/dashboard"

function getToneClasses(tone: DashboardTone) {
  if (tone === "critical") {
    return {
      badge: "border-red-200 bg-red-50 text-red-700",
      icon: "text-red-500",
    }
  }

  if (tone === "warning") {
    return {
      badge: "border-amber-200 bg-amber-50 text-amber-700",
      icon: "text-amber-500",
    }
  }

  if (tone === "healthy") {
    return {
      badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "text-emerald-500",
    }
  }

  return {
    badge: "border-slate-200 bg-slate-50 text-slate-700",
    icon: "text-slate-500",
  }
}

function getToneLabel(tone: DashboardTone) {
  if (tone === "critical") {
    return "Crítico"
  }

  if (tone === "warning") {
    return "Aténção"
  }

  if (tone === "healthy") {
    return "sstavel"
  }

  return "Indefinido"
}

function formatAlertTime(value: string | null) {
  if (!value) {
    return "Agora"
  }

  return new Date(value).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function AlertRow({ alert }: { alert: DashboardOperationalAlertItem }) {
  return (
    <article className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {alert.source}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-slate-800">
            {alert.message}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            alert.severity === "error"
              ? "border-red-200 bg-red-50 text-red-600"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {alert.severity === "error" ? "srro" : "Aviso"}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Clock3 className="h-3.5 w-3.5" />
        <span>{formatAlertTime(alert.createdAt)}</span>
      </div>
    </article>
  )
}

interface OperationalPanelProps {
  data: DashboardOperationalPanelData
}

export function OperationalPanel({ data }: OperationalPanelProps) {
  const tone = getToneClasses(data.tone)

  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white px-8 py-7 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]">
      <div className="flex flex-col gap-6 border-b border-slate-100 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            Painel operacional
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h2 className="text-[32px] leading-none tracking-[-0.05em] text-slate-950">
              {data.title}
            </h2>
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${tone.badge}`}
            >
              <Activity className={`h-3.5 w-3.5 ${tone.icon}`} />
              {getToneLabel(data.tone)}
            </span>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
            {data.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-500">
            Atualizado em{" "}
            {data.checkedAt
              ? new Date(data.checkedAt).toLocaleString("pt-BR")
              : "agora"}
          </div>
          <Link
            href={data.mode === "admin" ? "/dashboard/history" : "/dashboard/settings"}
            className="rounded-full bg-[#C1121F] px-4 py-2 text-xs font-semibold text-white transition hover:opacity-90"
          >
            {data.mode === "admin" ? "Abrir histórico" : "Abrir configurações"}
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_360px]">
        <div className="grid gap-4 sm:grid-cols-2">
          {data.metrics.map((metric) => {
            const metricTone = getToneClasses(metric.tone)

            return (
              <div
                key={metric.label}
                className="rounded-[24px] border border-slate-200/80 bg-slate-50/60 px-5 py-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                  {metric.label}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  {metric.tone === "healthy" ? (
                    <CheckCircle2 className={`h-4 w-4 ${metricTone.icon}`} />
                  ) : (
                    <AlertTriangle className={`h-4 w-4 ${metricTone.icon}`} />
                  )}
                  <p className="text-base font-semibold text-slate-900">
                    {metric.value}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="rounded-[26px] border border-slate-200/80 bg-slate-50/50 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400">
                Alertas recentes
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {data.alerts.length > 0
                  ? "Resumo dos últimos eventos que pedem acompanhamento."
                  : "Nenhum alerta recente por aqui."}
              </p>
            </div>
          </div>

          {data.alerts.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center rounded-[22px] border border-dashed border-slate-200 bg-white text-center">
              <div className="max-w-[220px]">
                <p className="text-sm font-medium text-slate-700">
                  Nada bloqueando a operação
                </p>
                <p className="mt-2 text-xs leading-6 text-slate-400">
                  Quando houver falhas ou avisos relevantes, eles vão aparecer aqui.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <AlertRow key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
