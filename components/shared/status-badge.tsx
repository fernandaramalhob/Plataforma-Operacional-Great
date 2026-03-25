import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type StatusBadgeTone = "neutral" | "success" | "danger" | "warning" | "info"

type StatusBadgeProps = {
  children: ReactNode
  tone?: StatusBadgeTone
  className?: string
}

const toneClasses: Record<StatusBadgeTone, string> = {
  neutral: "bg-gray-100 text-gray-500",
  success: "bg-green-50 text-green-600",
  danger: "bg-red-50 text-red-500",
  warning: "bg-yellow-50 text-yellow-700",
  info: "bg-blue-50 text-blue-600",
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
