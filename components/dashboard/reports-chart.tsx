"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

const data = [
  { week: "13/01", reports: 85 },
  { week: "20/01", reports: 78 },
  { week: "27/01", reports: 88 },
  { week: "03/02", reports: 80 },
  { week: "10/02", reports: 87 },
  { week: "17/02", reports: 82 },
  { week: "24/02", reports: 84 },
  { week: "03/03", reports: 90 },
]

export function ReportsChart() {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          Relatórios por Semana
        </h2>
        <span className="text-sm text-gray-400">Últimas 8 semanas</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} barSize={32}>
          <CartesianGrid vertical={false} stroke="#F1F5F9" />
          <XAxis
            dataKey="week"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#94A3B8" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#94A3B8" }}
            domain={[0, 100]}
            ticks={[0, 25, 50, 90]}
          />
          <Tooltip
            cursor={{ fill: "#F8FAFC" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="reports" fill="#BAE0F5" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}