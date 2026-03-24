"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, CalendarDays, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"

interface HeaderProps {
  title: string
  subtitle?: string
}

function getDefaultRange() {
  const today = new Date()
  const weekStart = new Date(today)
  const dayOfWeek = today.getDay()
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

  weekStart.setDate(today.getDate() + diffToMonday)
  weekStart.setHours(0, 0, 0, 0)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(0, 0, 0, 0)

  return { weekStart, weekEnd }
}

function formatDate(date: Date) {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatInputDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function parseInputDate(value: string | null) {
  if (!value) {
    return null
  }

  const [year, month, day] = value.split("-").map(Number)

  if (!year || !month || !day) {
    return null
  }

  const parsed = new Date(year, month - 1, day)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "GG"

  const defaultRange = getDefaultRange()
  const selectedStart = parseInputDate(searchParams.get("startDate")) ?? defaultRange.weekStart
  const selectedEnd = parseInputDate(searchParams.get("endDate")) ?? defaultRange.weekEnd
  const hasInvalidQueryRange = selectedStart.getTime() > selectedEnd.getTime()
  const currentStart = hasInvalidQueryRange ? defaultRange.weekStart : selectedStart
  const currentEnd = hasInvalidQueryRange ? defaultRange.weekEnd : selectedEnd

  const [draftStart, setDraftStart] = useState(formatInputDate(currentStart))
  const [draftEnd, setDraftEnd] = useState(formatInputDate(currentEnd))
  const hasDraftError = draftStart > draftEnd

  function toggleDateFilter() {
    if (isDateFilterOpen) {
      setIsDateFilterOpen(false)
      return
    }

    setDraftStart(formatInputDate(currentStart))
    setDraftEnd(formatInputDate(currentEnd))
    setIsDateFilterOpen(true)
  }

  function applyDateFilter() {
    if (hasDraftError) {
      return
    }

    const params = new URLSearchParams(searchParams.toString())
    params.set("startDate", draftStart)
    params.set("endDate", draftEnd)

    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setIsDateFilterOpen(false)
  }

  function resetDateFilter() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("startDate")
    params.delete("endDate")

    const nextQuery = params.toString()
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false })
    setIsDateFilterOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-gray-100 bg-white px-8">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-gray-400">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          {isDateFilterOpen && (
            <button
              type="button"
              aria-label="Fechar filtro de periodo"
              className="fixed inset-0 z-10 cursor-default"
              onClick={() => setIsDateFilterOpen(false)}
            />
          )}

          <button
            type="button"
            className="relative z-20 flex items-center gap-2 rounded-lg border border-transparent bg-gray-50 px-3 py-2 text-sm text-gray-500 transition hover:border-gray-200 hover:bg-white"
            onClick={toggleDateFilter}
          >
            <CalendarDays className="h-4 w-4 text-gray-400" />
            <span>
              Periodo: {formatDate(currentStart)} - {formatDate(currentEnd)}
            </span>
            <ChevronDown
              className={`h-4 w-4 text-gray-400 transition ${isDateFilterOpen ? "rotate-180" : ""}`}
            />
          </button>

          {isDateFilterOpen && (
            <div className="absolute right-0 top-full z-20 mt-3 w-[320px] rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Filtrar periodo</p>
                  <p className="mt-1 text-xs text-gray-400">
                    Escolha um intervalo de datas para atualizar o periodo exibido.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-500">De</span>
                    <input
                      type="date"
                      value={draftStart}
                      onChange={(event) => setDraftStart(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#C1121F]"
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-xs font-medium text-gray-500">Ate</span>
                    <input
                      type="date"
                      value={draftEnd}
                      onChange={(event) => setDraftEnd(event.target.value)}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#C1121F]"
                    />
                  </label>
                </div>

                {hasDraftError && (
                  <p className="text-xs text-red-500">
                    A data inicial precisa ser menor ou igual a data final.
                  </p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-500 transition hover:text-gray-700"
                    onClick={resetDateFilter}
                  >
                    Semana atual
                  </button>

                  <button
                    type="button"
                    className="rounded-xl bg-[#C1121F] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={applyDateFilter}
                    disabled={hasDraftError}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <button className="relative flex h-9 w-9 items-center justify-center rounded-full transition hover:bg-gray-50">
          <Bell className="h-5 w-5 text-gray-500" />
        </button>

        <Link href="/dashboard/profile">
          <div className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#C1121F] transition hover:opacity-90">
            <span className="text-sm font-semibold text-white">{initials}</span>
          </div>
        </Link>
      </div>
    </header>
  )
}
