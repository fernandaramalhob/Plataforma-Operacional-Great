import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type EmptyStateProps = {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "glass-card flex flex-col items-center justify-center rounded-[30px] border-dashed px-6 py-16 text-center",
        className
      )}
    >
      <p className="text-lg font-medium text-[color:var(--color-app-text)]">{title}</p>
      {description ? (
        <p className="mt-2 max-w-xl text-sm text-[color:var(--color-app-text-soft)]">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
