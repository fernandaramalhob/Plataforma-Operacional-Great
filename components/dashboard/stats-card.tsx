import {
  AlertTriangle,
  FileText,
  Link2,
  LucideIcon,
  Users,
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
  activeClients: {
    icon: Users,
    iconColor: "text-blue-500",
  },
  connectedCampaigns: {
    icon: Link2,
    iconColor: "text-rose-500",
  },
  reportsGenerated: {
    icon: FileText,
    iconColor: "text-red-400",
  },
  failedReports: {
    icon: AlertTriangle,
    iconColor: "text-orange-500",
    valueColor: "text-red-500",
    borderClass: "border-red-100/80",
  },
}

interface DashboardStatsProps {
  stats: DashboardStat[]
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => {
        const config = iconMap[stat.key]
        const Icon = config.icon

        return (
          <section
            key={stat.label}
            className={`relative overflow-hidden rounded-[26px] border ${
              config.borderClass ?? "border-slate-200/80"
            } bg-white px-7 py-6 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.35)]`}
          >
            <div className="relative flex items-start justify-between gap-4">
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                    {stat.label}
                  </p>
                </div>
                <div>
                  <p
                    className={`text-[54px] leading-none tracking-[-0.06em] ${
                      config.valueColor ?? stat.valueColor ?? "text-slate-900"
                    }`}
                  >
                    {stat.value}
                  </p>
                  <p
                    className={`mt-3 text-sm leading-6 ${
                      stat.subColor ?? "text-slate-500"
                    }`}
                  >
                    {stat.sub}
                  </p>
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-100 bg-slate-50">
                <Icon className={`h-3.5 w-3.5 ${config.iconColor}`} strokeWidth={1.7} />
              </div>
            </div>
          </section>
        )
      })}
    </div>
  )
}
