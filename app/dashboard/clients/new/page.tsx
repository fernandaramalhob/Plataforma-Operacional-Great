import { Suspense } from "react"
import NewClientPageClient from "./new-client-page-client"

function NewClientPageFallback() {
  return (
    <div className="p-8">
      <div className="h-8 w-56 animate-pulse rounded-xl bg-slate-200/70" />
      <div className="mt-6 h-96 animate-pulse rounded-3xl bg-slate-100/80" />
    </div>
  )
}

export default function NewClientPage() {
  return (
    <Suspense fallback={<NewClientPageFallback />}>
      <NewClientPageClient />
    </Suspense>
  )
}
