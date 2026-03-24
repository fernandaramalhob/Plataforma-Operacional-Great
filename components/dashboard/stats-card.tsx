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
    iconBg: string
    iconColor: string
  }
> = {
  activeClients: {
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-400",
  },
  connectedCampaigns: {
    icon: Link2,
    iconBg: "bg-rose-50",
    iconColor: "text-rose-400",
  },
  reportsGenerated: {
    icon: FileText,
    iconBg: "bg-red-50",
    iconColor: "text-red-400",
  },
  failedReports: {
    icon: AlertTriangle,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-400",
  },
}

interface DashboardStatsProps {
  stats: DashboardStat[]
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const config = iconMap[stat.key]
        const Icon = config.icon

        return (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center ${config.iconBg}`}
              >
                <Icon className={`w-5 h-5 ${config.iconColor}`} />
              </div>
            </div>
            <p className={`font-bold mb-1 text-4xl ${stat.valueColor ?? "text-gray-900"}`}>
              {stat.value}
            </p>
            <p className={`text-sm ${stat.subColor ?? "text-gray-400"}`}>{stat.sub}</p>
          </div>
        )
      })}
    </div>
  )
}
