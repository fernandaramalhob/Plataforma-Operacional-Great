import Link from "next/link"
import {
  DashboardActivityStatus,
  DashboardRecentActivityItem,
} from "@/lib/dashboard"

const colors = [
  "bg-blue-500",
  "bg-rose-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getColor(name: string) {
  return colors[name.charCodeAt(0) % colors.length]
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function getStatusClasses(status: DashboardActivityStatus) {
  if (status === "Enviado") {
    return "text-green-600 bg-green-50"
  }

  if (status === "Falha") {
    return "text-red-500 bg-red-50"
  }

  if (status === "Conectado") {
    return "text-blue-600 bg-blue-50"
  }

  return "text-amber-600 bg-amber-50"
}

interface RecentActivityProps {
  activities: DashboardRecentActivityItem[]
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          Atividade recente
        </h2>
        <Link
          href="/dashboard/reports"
          className="text-sm text-[#C1121F] hover:underline font-medium"
        >
          Ver todos
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="flex h-[280px] items-center justify-center text-center">
          <div className="max-w-[220px] space-y-1">
            <p className="text-sm font-medium text-gray-500">
              Nenhuma atividade real encontrada
            </p>
            <p className="text-xs text-gray-400">
              Clientes conectados e relatorios salvos vao aparecer aqui.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(item.name)}`}
              >
                <span className="text-white text-xs font-semibold">
                  {getInitials(item.name)}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.campaign}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusClasses(item.status)}`}
                >
                  {item.status}
                </span>
                <span className="text-xs text-gray-400">{item.time}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
