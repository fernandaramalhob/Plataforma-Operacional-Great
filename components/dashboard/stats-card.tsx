import {
  CheckCircle2,
  Clock3,
  LucideIcon,
  XCircle,
} from "lucide-react"
import { DashboardStat } from "@/lib/dashboard"

const iconMap: Record<
  DashboardStat["key"],
  {
    icon: LucideIcon
    iconColor: string
    valueColor?: string
    borderClass?: string
  }
> = {
  sentReports: {
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
  },
  failedReports: {
    icon: XCircle,
    iconColor: "text-[var(--color-danger-text)]",
    borderClass: "border-[color:var(--color-dashboard-accent-border)]",
  },
  pendingReports: {
    icon: Clock3,
    iconColor: "text-gray-400",
  },
}

interface DashboardStatsProps {
  stats: DashboardStat[]
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const gridClass =
    stats.length === 3
      ? "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
      : "grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4"

  return (
    <div className={gridClass}>
      {stats.map((stat) => {
        const config = iconMap[stat.key]
        const Icon = config.icon

        return (
          <section
            key={stat.label}
            className={`dashboard-panel relative overflow-hidden rounded-[26px] border px-7 py-6 ${
              config.borderClass ?? ""
            }`}
          >
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
                    {stat.label}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-[54px] leading-none tracking-[-0.06em] ${
                      config.valueColor ?? stat.valueColor ?? "text-[color:var(--color-app-text)]"
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={`mt-3 text-sm leading-6 ${
                      stat.subColor ?? "text-[color:var(--color-app-text-soft)]"
                    }`}
                  >
                    {stat.sub}
                  </p>
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)]">
                <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} strokeWidth={1.7} />
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
