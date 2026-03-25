import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ErrorStateProps = {
  message: string
  title?: string
  action?: ReactNode
  className?: string
}

export function ErrorState({
  message,
  title = "Algo deu errado",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-red-600",
        className
      )}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-sm">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
