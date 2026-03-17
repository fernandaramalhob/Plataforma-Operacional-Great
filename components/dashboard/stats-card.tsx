import { Users, FileText, AlertTriangle, Clock } from "lucide-react"

const stats = [
  {
    label: "Clientes Ativos",
    value: "90",
    sub: "+4 este mês",
    subColor: "text-green-500",
    icon: Users,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-400",
  },
  {
    label: "Relatórios Enviados",
    value: "87",
    sub: "esta semana",
    subColor: "text-gray-400",
    icon: FileText,
    iconBg: "bg-purple-50",
    iconColor: "text-purple-400",
  },
  {
    label: "Falhas no Envio",
    value: "2",
    valueColor: "text-red-500",
    sub: "⚠ requerem atenção",
    subColor: "text-red-400",
    icon: AlertTriangle,
    iconBg: "bg-red-50",
    iconColor: "text-red-400",
  },
  {
    label: "Próximo Envio",
    value: "Segunda",
    valueLarge: true,
    sub: "🕐 10:00 · em 3 dias",
    subColor: "text-gray-400",
    icon: Clock,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-400",
  },
]

export function DashboardStats() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm text-gray-500">{stat.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.iconBg}`}>
                <Icon className={`w-5 h-5 ${stat.iconColor}`} />
              </div>
            </div>
            <p className={`font-bold mb-1 ${stat.valueLarge ? "text-3xl" : "text-4xl"} ${stat.valueColor ?? "text-gray-900"}`}>
              {stat.value}
            </p>
            <p className={`text-sm ${stat.subColor}`}>{stat.sub}</p>
          </div>
        )
      })}
    </div>
  )
}