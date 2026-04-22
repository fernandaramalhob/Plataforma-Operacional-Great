"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  History,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Users,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
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
        "fixed left-0 top-0 z-30 flex h-screen flex-col border-r border-[color:var(--color-app-border)] bg-[var(--color-app-surface-elevated)] shadow-[18px_0_40px_-32px_rgba(15,23,42,0.32)] backdrop-blur-xl transition-[width] duration-200",
        collapsed ? "w-[88px]" : "w-[280px]"
      )}
    >
      <div
        className={cn(
          "border-b border-[color:var(--color-app-border)] py-5",
          collapsed ? "px-4" : "px-6"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "justify-between gap-3"
          )}
        >
          <Link
            href="/dashboard"
            aria-label="Ir para o dashboard"
            className={cn(
              "group flex min-w-0 items-center gap-3 rounded-2xl transition hover:opacity-90",
              collapsed && "justify-center"
            )}
          >
            <Image
              src="/logo.png"
              alt="Logo GreatGo"
              width={44}
              height={44}
              className="h-11 w-11 shrink-0 object-contain"
              priority
            />
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
                  GreatGo
                </p>
                <p className="text-[13px] font-medium text-[color:var(--color-app-text-muted)]">
                  Plataforma operacional
                </p>
              </div>
            )}
          </Link>

          {!collapsed && (
            <button
              type="button"
              onClick={onToggle}
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[color:var(--color-app-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-soft)] transition hover:border-[color:var(--color-app-border-strong)] hover:bg-[var(--color-app-surface-muted)] hover:text-[color:var(--color-app-text)]"
              title="Recolher menu"
              aria-label="Recolher menu"
            >
              <PanelLeftClose className="h-5 w-5" />
            </button>
          )}
        </div>

        {collapsed && (
          <button
            type="button"
            onClick={onToggle}
            className="mx-auto mt-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[color:var(--color-app-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-faint)] transition hover:bg-[var(--color-app-surface-muted)] hover:text-[color:var(--color-app-text-soft)]"
            title="Expandir menu"
            aria-label="Expandir menu"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
        )}
      </div>

      <nav className={cn("flex-1 py-6", collapsed ? "px-2" : "px-3")}>
        {!collapsed && (
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-app-text-faint)]">
            Navegação
          </p>
        )}
        <ul className="space-y-1">
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
                    "flex rounded-2xl text-sm font-medium transition-all",
                    collapsed
                      ? "items-center justify-center px-0 py-3"
                      : "items-center gap-3 px-3 py-2.5",
                    isActive
                      ? "bg-[var(--color-primary-soft)] text-[var(--color-primary)] shadow-[0_10px_24px_-18px_rgba(193,18,31,0.7)]"
                      : "text-[color:var(--color-app-text-soft)] hover:bg-[var(--color-app-surface-muted)] hover:text-[color:var(--color-app-text)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      isActive
                        ? "text-[var(--color-primary)]"
                        : "text-[color:var(--color-app-text-faint)]"
                    )}
                  />
                  {!collapsed && label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <div
        className={cn(
          "border-t border-[color:var(--color-app-border)]",
          collapsed ? "px-2 py-4" : "px-4 py-4"
        )}
      >
        <div
          className={cn(
            "flex items-center",
            collapsed ? "flex-col gap-3" : "justify-between"
          )}
        >
          <div className={cn("flex items-center", collapsed ? "flex-col gap-2" : "gap-3")}>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C1121F] shadow-[0_10px_20px_-14px_rgba(193,18,31,0.8)]">
              <span className="text-sm font-semibold text-white">{initials}</span>
            </div>
            {!collapsed && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold leading-tight text-[color:var(--color-app-text)]">
                  {session?.user?.name ?? "Não autenticado"}
                </span>
                <span className="text-xs text-[color:var(--color-app-text-faint)]">
                  {roleLabel}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[color:var(--color-app-border)] bg-[var(--color-app-surface)] text-[color:var(--color-app-text-soft)] transition hover:border-[color:var(--color-app-border-strong)] hover:bg-[var(--color-app-surface-muted)] hover:text-[color:var(--color-app-text)]"
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  )
}
