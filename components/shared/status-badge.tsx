import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type StatusBadgeTone = "neutral" | "success" | "danger" | "warning" | "info"

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusBadgeTone
  className?: string
}

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-muted)] text-[color:var(--color-app-text-soft)]",
  success: "border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-muted)] text-[color:var(--color-app-text-muted)]",
  danger: "border border-[#df2531]/15 bg-[rgba(223,37,49,0.08)] text-[#df2531]",
  warning: "border border-[#df2531]/15 bg-[rgba(223,37,49,0.08)] text-[#9f1239]",
  info: "border border-[color:var(--color-app-border)] bg-[var(--color-app-surface-muted)] text-[color:var(--color-app-text-muted)]",
}

export function StatusBadge({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
