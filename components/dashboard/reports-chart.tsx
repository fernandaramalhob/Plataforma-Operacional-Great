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
    <section className="dashboard-panel h-full rounded-[32px] border px-8 py-7">
      <div className="mb-8 flex items-end justify-between gap-5 border-b border-[color:var(--color-dashboard-accent-border)] pb-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[color:var(--color-app-text-faint)]">
            Linha do tempo
          </p>
          <h2 className="mt-2 whitespace-nowrap text-[34px] leading-none tracking-[-0.05em] text-[color:var(--color-app-text)]">
            Relatórios por período
          </h2>
          <p className="mt-3 text-sm text-[color:var(--color-app-text-faint)]">
            {activeSeries.label}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <FilterSelect
            value={filter}
            onChange={(value) => setFilter(value as DashboardChartFilter)}
            className="min-w-[96px]"
            buttonClassName="justify-between rounded-full border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-app-surface)] py-1 pl-3 pr-3 text-[13px] shadow-none"
            dropdownClassName="rounded-2xl"
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
                <stop offset="0%" stopColor="var(--color-dashboard-accent)" stopOpacity={0.22} />
                <stop offset="100%" stopColor="var(--color-dashboard-accent)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--color-dashboard-grid)"
              strokeDasharray="3 6"
            />
            <XAxis
              dataKey="week"
              axisLine={false}
              tickLine={false}
              tickMargin={12}
              tick={{ fontSize: 12, fill: "var(--color-app-text-faint)" }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickMargin={18}
              tick={{ fontSize: 12, fill: "var(--color-app-text-faint)" }}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{
                stroke: "var(--color-dashboard-accent)",
                strokeDasharray: "4 4",
              }}
              contentStyle={{
                borderRadius: "18px",
                border: "1px solid var(--color-dashboard-tooltip-border)",
                backgroundColor: "var(--color-app-surface)",
                boxShadow: "var(--color-dashboard-shadow)",
                color: "var(--color-app-text)",
                fontSize: "13px",
              }}
            />
            <Area
              type="monotone"
              dataKey="reports"
              stroke="var(--color-dashboard-accent)"
              strokeWidth={2.5}
              fill="url(#reports-area-fill)"
              dot={{ r: 0 }}
              activeDot={{ r: 4, fill: "var(--color-dashboard-accent)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex h-[300px] items-center justify-center rounded-[28px] border border-dashed border-[color:var(--color-dashboard-accent-border)] bg-[var(--color-dashboard-accent-soft)] text-center">
          <div className="max-w-[280px]">
            <p className="text-sm font-medium text-[color:var(--color-app-text-muted)]">
              Ainda não há dados suficientes para exibir o gráfico.
            </p>
            <p className="mt-2 text-xs leading-6 text-[color:var(--color-app-text-faint)]">
              Assim que os relatórios forem gerados, a evolução do período vai aparecer aqui.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
