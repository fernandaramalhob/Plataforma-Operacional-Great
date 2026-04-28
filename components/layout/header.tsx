"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, CalendarDays, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface HeaderProps {
  title?: string
  subtitle?: string
}

type DashboardRangeState = {
  weekStart: Date
  weekEnd: Date
  allTime: boolean
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

function readRangeFromLocation(search: string, fallback = getDefaultRange()): DashboardRangeState {
  const params = new URLSearchParams(search)
  const period = params.get("period")
  const selectedStart = parseInputDate(params.get("startDate")) ?? fallback.weekStart
  const selectedEnd = parseInputDate(params.get("endDate")) ?? fallback.weekEnd

  if (period === "all") {
    return { weekStart: selectedStart, weekEnd: selectedEnd, allTime: true }
  }

  if (selectedStart.getTime() > selectedEnd.getTime()) {
    return { ...fallback, allTime: false }
  }

  return { weekStart: selectedStart, weekEnd: selectedEnd, allTime: false }
}

const DEFAULT_RANGE = getDefaultRange()

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)

  const [currentRange, setCurrentRange] = useState<DashboardRangeState>(() =>
    typeof window === "undefined"
      ? { ...DEFAULT_RANGE, allTime: false }
      : readRangeFromLocation(window.location.search, DEFAULT_RANGE)
  )
  const [draftStart, setDraftStart] = useState(formatInputDate(currentRange.weekStart))
  const [draftEnd, setDraftEnd] = useState(formatInputDate(currentRange.weekEnd))
  const hasDraftError = draftStart > draftEnd
  const isAllTime = currentRange.allTime

  useEffect(() => {
    const syncRangeFromLocation = () => {
      setCurrentRange(readRangeFromLocation(window.location.search, DEFAULT_RANGE))
    }

    syncRangeFromLocation()
    window.addEventListener("popstate", syncRangeFromLocation)

    return () => {
      window.removeEventListener("popstate", syncRangeFromLocation)
    }
  }, [pathname])

  const isDashboardHome = pathname === "/dashboard"
  const initials =
    session?.user?.name
      ?.split(" ")
      .map((namePart) => namePart[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "GG"

  function toggleDateFilter() {
    if (isDateFilterOpen) {
      setIsDateFilterOpen(false)
      return
    }

    setDraftStart(formatInputDate(currentRange.weekStart))
    setDraftEnd(formatInputDate(currentRange.weekEnd))
    setIsDateFilterOpen(true)
  }

  function applyDateFilter() {
    if (hasDraftError) {
      return
    }

    const params = new URLSearchParams(window.location.search)
    params.set("startDate", draftStart)
    params.set("endDate", draftEnd)
    params.delete("period")

    const selectedStart = parseInputDate(draftStart) ?? DEFAULT_RANGE.weekStart
    const selectedEnd = parseInputDate(draftEnd) ?? DEFAULT_RANGE.weekEnd

    setCurrentRange({
      weekStart: selectedStart,
      weekEnd: selectedEnd,
      allTime: false,
    })
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setIsDateFilterOpen(false)
  }

  function applyAllTimeFilter() {
    const params = new URLSearchParams(window.location.search)
    params.delete("startDate")
    params.delete("endDate")
    params.set("period", "all")

    setCurrentRange({ ...DEFAULT_RANGE, allTime: true })
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    setIsDateFilterOpen(false)
  }

  function resetDateFilter() {
    setCurrentRange({ ...DEFAULT_RANGE, allTime: false })
    router.replace(pathname, { scroll: false })
    setIsDateFilterOpen(false)
  }

  return (
    <header className="sticky top-0 z-20 px-6 pt-4 sm:px-8">
      <div className="mx-auto max-w-[1480px]">
        <div className="rounded-[30px] border border-[#e5e7eb] bg-white px-6 py-4 shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)]">
          <div className="grid min-h-[52px] grid-cols-1 items-center gap-5 lg:grid-cols-[1fr_auto_1fr]">
            <div className="flex items-start gap-4">
              <div className="mt-1 h-11 w-1.5 rounded-full bg-[#df2531]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#94a3b8]">
                  {title ?? "Dashboard"}
                </p>
                <p className="mt-1 text-[15px] text-[#6b7280]">
                  Operação central da plataforma
                </p>
              </div>
            </div>

            <div className="flex justify-start lg:justify-center">
              {isDashboardHome ? (
                <div className="relative">
                  {isDateFilterOpen ? (
                    <button
                      type="button"
                      aria-label="Fechar filtro de período"
                      className="fixed inset-0 z-10 cursor-default"
                      onClick={() => setIsDateFilterOpen(false)}
                    />
                  ) : null}

                  <button
                    type="button"
                    className="inline-flex min-w-[318px] items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 py-2 text-[14px] text-[#4b5563] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.18)] transition hover:border-[#d1d5db]"
                    onClick={toggleDateFilter}
                  >
                    <CalendarDays className="h-4 w-4 text-[#9ca3af]" />
                    <span>
                      Período:{" "}
                      {isAllTime
                        ? "Todo o tempo"
                        : `${formatDate(currentRange.weekStart)} - ${formatDate(
                            currentRange.weekEnd
                          )}`}
                    </span>
                    <ChevronDown className="h-4 w-4 text-[#9ca3af]" />
                  </button>

                  {isDateFilterOpen ? (
                    <div className="absolute left-1/2 top-full z-20 mt-3 w-[320px] -translate-x-1/2 rounded-[28px] border border-[#e5e7eb] bg-white p-4 shadow-[0_18px_48px_-32px_rgba(15,23,42,0.25)]">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-[#111827]">
                            Filtrar período
                          </p>
                          <p className="mt-1 text-xs text-[#9ca3af]">
                            Escolha um intervalo de datas para atualizar o período exibido.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-[#6b7280]">
                              De
                            </span>
                            <input
                              type="date"
                              value={draftStart}
                              onChange={(event) => setDraftStart(event.target.value)}
                              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#374151] outline-none transition focus:border-[#df2531]"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-[#6b7280]">
                              Até
                            </span>
                            <input
                              type="date"
                              value={draftEnd}
                              onChange={(event) => setDraftEnd(event.target.value)}
                              className="w-full rounded-2xl border border-[#e5e7eb] bg-white px-3 py-2 text-sm text-[#374151] outline-none transition focus:border-[#df2531]"
                            />
                          </label>
                        </div>

                        {hasDraftError ? (
                          <p className="text-xs text-red-500">
                            A data inicial precisa ser menor ou igual à data final.
                          </p>
                        ) : null}

                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            className="text-sm font-medium text-[#6b7280] transition hover:text-[#111827]"
                            onClick={resetDateFilter}
                          >
                            Semana atual
                          </button>

                          <button
                            type="button"
                            className="text-sm font-medium text-[#6b7280] transition hover:text-[#111827]"
                            onClick={applyAllTimeFilter}
                          >
                            Todo o tempo
                          </button>

                          <button
                            type="button"
                            className="rounded-2xl bg-[#df2531] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#c81f2a] disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={applyDateFilter}
                            disabled={hasDraftError}
                          >
                            Aplicar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="h-9 w-[318px]" aria-hidden="true" />
              )}
            </div>

            <div className="flex items-center justify-start gap-2 lg:justify-end">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-[#6b7280] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.16)]"
              >
                <Bell className="h-4 w-4" />
              </button>

              <ThemeToggle />

              {session?.user ? (
                <Link
                  href="/dashboard/profile"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e5e7eb] bg-white text-sm font-semibold text-[#111827] shadow-[0_8px_18px_-16px_rgba(15,23,42,0.16)]"
                >
                  {(initials || "GG").slice(0, 2)}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
