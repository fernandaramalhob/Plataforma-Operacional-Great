"use client"

import { useState } from "react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { DashboardChartData, DashboardChartFilter } from "@/lib/dashboard"

interface ReportsChartProps {
  data: DashboardChartData
}

export function ReportsChart({ data }: ReportsChartProps) {
  const [filter, setFilter] = useState<DashboardChartFilter>("weeks")
  const activeSeries = data[filter]

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-base font-semibold text-gray-900">
          Relatorios por periodo
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{activeSeries.label}</span>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value as DashboardChartFilter)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
          >
            <option value="weeks">Semanas</option>
            <option value="months">Meses</option>
            <option value="days">Dias</option>
          </select>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={activeSeries.data} barSize={32}>
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
            allowDecimals={false}
          />
          <Tooltip
            cursor={{ fill: "#F8FAFC" }}
            contentStyle={{
              borderRadius: "12px",
              border: "1px solid #E2E8F0",
              fontSize: "13px",
            }}
          />
          <Bar dataKey="reports" fill="#F8C4C9" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
