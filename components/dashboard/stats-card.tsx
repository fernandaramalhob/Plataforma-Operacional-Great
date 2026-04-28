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
    iconColor: "text-[#df2531]",
    valueColor: "text-[#111827]",
  },
  failedReports: {
    icon: XCircle,
    iconColor: "text-[var(--color-danger-text)]",
    valueColor: "text-[#ef4444]",
    borderClass: "border-[color:var(--color-dashboard-accent-border)]",
  },
  pendingReports: {
    icon: Clock3,
    iconColor: "text-[color:var(--color-app-text-faint)]",
    valueColor: "text-[#111827]",
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
            className={`dashboard-panel relative overflow-hidden rounded-[32px] border border-[#e5e7eb] px-7 py-6 ${
              config.borderClass ?? ""
            }`}
          >
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
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
                </div>
              </div>

              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#e5e7eb] bg-[rgba(223,37,49,0.08)]">
                <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} strokeWidth={1.7} />
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
