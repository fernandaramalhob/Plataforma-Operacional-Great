"use client"

import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme/theme-provider"

type ThemeToggleProps = {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, isReady, toggleTheme } = useTheme()
  const isDark = isReady ? theme === "dark" : false

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "theme-toggle inline-flex h-10 w-10 items-center justify-center rounded-full border",
        className
      )}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
    >
      <span className="theme-toggle__icon" aria-hidden="true">
        {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  )
}
