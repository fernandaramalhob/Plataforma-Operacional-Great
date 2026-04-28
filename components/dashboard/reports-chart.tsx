"use client"

import { useState } from "react"
import { FilterSelect } from "@/components/ui/filter-controls"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { DashboardChartData, DashboardChartFilter } from "@/lib/dashboard"

interface ReportsChartProps {
  data: DashboardChartData
}

export function ReportsChart({ data }: ReportsChartProps) {
  const [filter, setFilter] = useState<DashboardChartFilter>("weeks")
  const activeSeries = data[filter]
  const hasData = activeSeries.data.some((item) => item.reports > 0)

  return (
    <section className="h-full rounded-[32px] border border-[#e5e7eb] bg-white px-8 py-7 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
      <div className="mb-8 flex items-end justify-between gap-5 border-b border-[#eef0f3] pb-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9ca3af]">
            Linha do tempo
          </p>
          <h2 className="mt-2 whitespace-nowrap text-[34px] leading-none tracking-[-0.05em] text-[#111827]">
            Relatórios por período
          </h2>
          <p className="mt-3 text-sm text-[#9ca3af]">
            {activeSeries.label}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FilterSelect
            value={filter}
            onChange={(value) => setFilter(value as DashboardChartFilter)}
            className="min-w-[96px]"
            buttonClassName="justify-between rounded-full border-[#e5e7eb] bg-white py-1 pl-3 pr-3 text-[13px] shadow-none"
            dropdownClassName="rounded-[22px]"
            options={[
              { value: "weeks", label: "Semanas" },
              { value: "months", label: "Meses" },
              { value: "days", label: "Dias" },
            ]}
          />
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={activeSeries.data}
            margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="reports-area-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#df2531" stopOpacity={0.18} />
                <stop offset="100%" stopColor="#df2531" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#e5e7eb"
              strokeDasharray="3 6"
            />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={18}
              tick={{ fontSize: 12, fill: "#9ca3af" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{
                stroke: "#df2531",
                strokeDasharray: "4 4",
              }}
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid #e5e7eb",
                backgroundColor: "#ffffff",
                boxShadow: "0 10px 24px -20px rgba(15,23,42,0.18)",
                color: "#111827",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="reports"
              stroke="#df2531"
              strokeWidth={2.5}
              fill="url(#reports-area-fill)"
              dot={{ r: 0 }}
              activeDot={{ r: 4, fill: "#df2531" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-[28px] border border-dashed border-[#e5e7eb] bg-[#fafafa] text-center">
          <div className="max-w-[280px]">
            <p className="text-sm font-medium text-[#374151]">
              Ainda não há dados suficientes para exibir o gráfico.
            </p>
            <p className="mt-2 text-xs leading-6 text-[#9ca3af]">
              Assim que os relatórios forem gerados, a evolução do período vai aparecer aqui.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
