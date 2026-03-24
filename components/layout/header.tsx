"use client"

import { useSession } from "next-auth/react"
import { Bell } from "lucide-react"

interface HeaderProps {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  const { data: session } = useSession()

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "GG"

  const today = new Date()
  const weekStart = new Date(today)
  weekStart.setDate(today.getDate() - today.getDay() + 1)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)

  const fmt = (d: Date) =>
    d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })

  return (
    <header className="h-[72px] bg-white border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-20">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        {subtitle && (
          <p className="text-sm text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg">
          <span className="text-gray-400">🕐</span>
          <span>Semana: {fmt(weekStart)} – {fmt(weekEnd)}</span>
        </div>
        <button className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-50 transition">
          <Bell className="w-5 h-5 text-gray-500" />
        </button>
        <div className="w-9 h-9 rounded-full bg-[#C1121F] flex items-center justify-center cursor-pointer">
          <span className="text-white text-sm font-semibold">{initials}</span>
        </div>
      </div>
    </header>
  )
}