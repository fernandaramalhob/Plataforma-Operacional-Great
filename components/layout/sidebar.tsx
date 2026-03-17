"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  LayoutDashboard,
  Users,
  FileText,
  History,
  Settings,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "Dashboard",     href: "/dashboard",              icon: LayoutDashboard },
  { label: "Clientes",      href: "/dashboard/clients",      icon: Users },
  { label: "Relatórios",    href: "/dashboard/reports",      icon: FileText },
  { label: "Histórico",     href: "/dashboard/history",      icon: History },
  { label: "Configurações", href: "/dashboard/settings",     icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  const initials = session?.user?.name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "AD"

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-white border-r border-gray-100 flex flex-col z-30">

      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
        <div className="w-9 h-9 bg-[#1AABDB] rounded-xl flex items-center justify-center">
          <span className="text-white text-base font-bold">M</span>
        </div>
        <span className="text-gray-900 font-bold text-lg">MetaReport</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-6">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest px-3 mb-3">
          Menu
        </p>
        <ul className="space-y-1">
          {navItems.map(({ label, href, icon: Icon }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href)

            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-[#EBF7FC] text-[#1AABDB]"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive ? "text-[#1AABDB]" : "text-gray-400")} />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1AABDB] flex items-center justify-center">
            <span className="text-white text-sm font-semibold">{initials}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-900 leading-tight">
              {session?.user?.name ?? "Admin User"}
            </span>
            <span className="text-xs text-gray-400">Administrador</span>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-gray-400 hover:text-gray-600 transition"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>

    </aside>
  )
}