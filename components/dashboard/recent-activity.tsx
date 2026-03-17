import Link from "next/link"

const activities = [
  {
    name: "Ana Beatriz",
    initials: "AB",
    campaign: "Campanha Verão 2025",
    status: "Enviado",
    time: "há 2h",
    color: "bg-blue-500",
  },
  {
    name: "Carlos Mendes",
    initials: "CM",
    campaign: "Promoção Clínica",
    status: "Falha",
    time: "há 3h",
    color: "bg-purple-500",
  },
  {
    name: "Daniela Souza",
    initials: "DS",
    campaign: "Black Friday Cosméticos",
    status: "Enviado",
    time: "há 5h",
    color: "bg-green-500",
  },
  {
    name: "Eduardo Lima",
    initials: "EL",
    campaign: "Conversão Academia",
    status: "Enviado",
    time: "há 7h",
    color: "bg-orange-500",
  },
]

export function RecentActivity() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          Atividade Recente
        </h2>
        <Link
          href="/dashboard/reports"
          className="text-sm text-[#1AABDB] hover:underline font-medium"
        >
          Ver todos →
        </Link>
      </div>

      <div className="space-y-4">
        {activities.map((item) => (
          <div key={item.name} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
              <span className="text-white text-xs font-semibold">
                {item.initials}
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
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.status === "Enviado"
                    ? "text-green-600 bg-green-50"
                    : "text-red-500 bg-red-50"
                }`}
              >
                {item.status}
              </span>
              <span className="text-xs text-gray-400">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}