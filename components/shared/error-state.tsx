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
        "rounded-[24px] border border-[#df2531]/15 bg-[rgba(223,37,49,0.08)] px-5 py-4 text-[#df2531]",
        className
      )}
    >
      <p className="text-sm font-semibold text-[color:var(--color-app-text)]">{title}</p>
      <p className="mt-1 text-sm text-[color:var(--color-app-text-soft)]">{message}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
