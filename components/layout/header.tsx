"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Bell, CalendarDays, CheckCheck, ChevronDown } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ThemeToggle } from "@/components/theme/theme-toggle"

interface HeaderProps {
  title?: string
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

export function Header({ title }: HeaderProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isDateFilterOpen, setIsDateFilterOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState([
    {
      id: "system-status",
      title: "Caixa limpa",
      description: "Quando houver avisos importantes do sistema, eles aparecerão aqui.",
      read: true,
    },
  ])

  const isDashboardHome = pathname === "/dashboard"
  const unreadCount = notifications.filter((notification) => !notification.read).length

  const initials = session?.user?.name
    ?.split(" ")
    .map((namePart) => namePart[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "GG"

  const defaultRange = getDefaultRange()
  const selectedStart =
    parseInputDate(searchParams.get("startDate")) ?? defaultRange.weekStart
  const selectedEnd =
    parseInputDate(searchParams.get("endDate")) ?? defaultRange.weekEnd
  const hasInvalidQueryRange = selectedStart.getTime() > selectedEnd.getTime()
  const currentStart = hasInvalidQueryRange ? defaultRange.weekStart : selectedStart
  const currentEnd = hasInvalidQueryRange ? defaultRange.weekEnd : selectedEnd

  const [draftStart, setDraftStart] = useState(formatInputDate(currentStart))
  const [draftEnd, setDraftEnd] = useState(formatInputDate(currentEnd))
  const hasDraftError = draftStart > draftEnd

  function toggleDateFilter() {
    setIsNotificationsOpen(false)

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
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
      scroll: false,
    })
    setIsDateFilterOpen(false)
  }

  function toggleNotifications() {
    setIsDateFilterOpen(false)
    setIsNotificationsOpen((current) => !current)
  }

  function markAllNotificationsAsRead() {
    setNotifications((current) =>
      current.map((notification) => ({ ...notification, read: true }))
    )
  }

  return (
    <header className="sticky top-0 z-20 px-8 pt-5">
      <div className="mx-auto max-w-[1480px]">
        <div className="rounded-[28px] border border-slate-200/80 bg-white/86 px-5 py-3.5 shadow-[0_20px_40px_-34px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <div className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-4">
            <div className="flex items-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {title ?? "Dashboard"}
              </p>
            </div>

            <div className="flex justify-center">
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
                    className="relative z-20 flex min-w-[272px] items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50/90 px-4 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white"
                    onClick={toggleDateFilter}
                  >
                    <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                    <span>
                      Período: {formatDate(currentStart)} - {formatDate(currentEnd)}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-400 transition ${
                        isDateFilterOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isDateFilterOpen ? (
                    <div className="absolute left-1/2 top-full z-20 mt-3 w-[320px] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-4 shadow-xl">
                      <div className="space-y-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            Filtrar período
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Escolha um intervalo de datas para atualizar o período exibido.
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-gray-500">
                              De
                            </span>
                            <input
                              type="date"
                              value={draftStart}
                              onChange={(event) => setDraftStart(event.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#C1121F]"
                            />
                          </label>

                          <label className="space-y-1.5">
                            <span className="text-xs font-medium text-gray-500">
                              Até
                            </span>
                            <input
                              type="date"
                              value={draftEnd}
                              onChange={(event) => setDraftEnd(event.target.value)}
                              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-[#C1121F]"
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
                  ) : null}
                </div>
              ) : (
                <div className="h-9 w-[272px]" aria-hidden="true" />
              )}
            </div>

            <div className="flex items-center justify-end gap-2">
              <ThemeToggle />

              <div className="relative">
                {isNotificationsOpen ? (
                  <button
                    type="button"
                    aria-label="Fechar notificações"
                    className="fixed inset-0 z-10 cursor-default"
                    onClick={() => setIsNotificationsOpen(false)}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={toggleNotifications}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-50/90 transition hover:border-slate-300 hover:bg-white"
                >
                  {unreadCount > 0 ? (
                    <span className="absolute right-1.5 top-1.5 z-10 h-2.5 w-2.5 rounded-full bg-[#C1121F]" />
                  ) : null}
                  <Bell className="h-4 w-4 text-slate-500" />
                </button>

                {isNotificationsOpen ? (
                  <div className="absolute right-0 top-full z-20 mt-3 w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.5)]">
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Notificações
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {unreadCount > 0
                            ? `${unreadCount} item(ns) pendente(s)`
                            : "Tudo em dia por enquanto"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={markAllNotificationsAsRead}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Marcar lidas
                      </button>
                    </div>

                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-2xl border px-3.5 py-3 ${
                            notification.read
                              ? "border-slate-200 bg-slate-50"
                              : "border-[#C1121F]/10 bg-[#FFF5F6]"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                                notification.read ? "bg-slate-300" : "bg-[#C1121F]"
                              }`}
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-800">
                                {notification.title}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500">
                                {notification.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setIsNotificationsOpen(false)}
                        className="rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-200"
                      >
                        Fechar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <Link href="/dashboard/profile">
                <div className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-[#C1121F] transition hover:opacity-90">
                  <span className="text-sm font-semibold text-white">
                    {initials}
                  </span>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
