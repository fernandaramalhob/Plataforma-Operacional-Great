import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

type LoadingSkeletonProps = {
  label?: string
  className?: string
}

export function LoadingSkeleton({
  label = "Carregando...",
  className,
}: LoadingSkeletonProps) {
  return (
    <div className={cn("flex items-center justify-center py-20", className)}>
      <div className="flex items-center gap-2 text-sm text-[color:var(--color-app-text-soft)]">
        <Loader2 className="h-5 w-5 animate-spin text-[#df2531]" />
        <span>{label}</span>
      </div>
    </div>
  )
}
