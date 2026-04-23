"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  History,
  LayoutGrid,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Clientes", href: "/dashboard/clients", icon: Users },
  { label: "Relatórios", href: "/dashboard/reports", icon: FileText },
  { label: "Histórico", href: "/dashboard/history", icon: History },
  { label: "Configurações", href: "/dashboard/settings", icon: Settings },
]

type SidebarProps = {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()
  const { data: session } = useSession()

  const roleLabel =
    session?.user?.role === "ADMIN"
      ? "Administrador"
      : session?.user?.role === "MANAGER"
        ? "Gestor"
        : "Não autenticado"

  const initials =
    session?.user?.name
      ?.split(" ")
      .map((name) => name[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "GG"

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-slate-200 bg-white shadow-[0_0_0_1px_rgba(15,23,42,0.02)] transition-[width] duration-200",
        collapsed ? "w-[88px]" : "w-[304px]"
      )}
    >
      <div className={cn("border-b border-slate-200 py-5", collapsed ? "px-4" : "px-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          <Link
            href="/dashboard"
            aria-label="Ir para o dashboard"
            className={cn("flex min-w-0 items-center gap-3 rounded-2xl transition hover:opacity-90", collapsed && "justify-center")}
          >
            <Image
              src="/logo.png"
              alt="Logo GreatGo"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              priority
            />
            {!collapsed ? (
              <p className="text-[28px] font-extrabold leading-none tracking-tight text-[#E02424]">
                GreatGo
              </p>
            ) : null}
          </Link>

          {!collapsed ? (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
              title="Recolher menu"
              aria-label="Recolher menu"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          ) : null}
        </div>

        {collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            title="Expandir menu"
            aria-label="Expandir menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className={cn("flex-1 py-6", collapsed ? "px-2" : "px-5")}>
        {!collapsed ? (
          <p className="mb-4 px-1 text-[13px] font-bold uppercase tracking-[0.24em] text-slate-400">
            Menu
          </p>
        ) : null}

        <ul className="space-y-1.5">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  title={collapsed ? label : undefined}
                  aria-label={label}
                  className={cn(
                    "flex rounded-2xl text-[15px] font-medium transition-all duration-150",
                    collapsed ? "items-center justify-center px-0 py-3.5" : "items-center gap-3 px-4 py-3",
                    isActive
                      ? "bg-[#FFF2F4] text-[#E02424]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[18px] w-[18px] shrink-0",
                      isActive ? "text-[#E02424]" : "text-slate-400"
                    )}
                  />
                  {!collapsed ? label : null}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="border-t border-slate-200 bg-white px-4 py-4">
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between gap-3")}>
          <div className={cn("flex min-w-0 items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B91C1C] shadow-[0_14px_26px_-18px_rgba(185,28,28,0.55)]">
              <span className="text-sm font-bold text-white">{initials}</span>
            </div>

            {!collapsed ? (
              <div className="min-w-0">
                <span className="block max-w-[120px] truncate text-[15px] font-bold leading-tight text-slate-900">
                  {session?.user?.name ?? "Não autenticado"}
                </span>
                <span className="block text-[13px] leading-tight text-slate-400">{roleLabel}</span>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair da conta"
            aria-label="Sair da conta"
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-full border-0 bg-transparent p-0 text-[#E02424] transition hover:bg-[#fff1f2] hover:text-[#C1121F]",
              collapsed ? "" : ""
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
          </button>
        </div>
      </div>
    </aside>
  )
}
