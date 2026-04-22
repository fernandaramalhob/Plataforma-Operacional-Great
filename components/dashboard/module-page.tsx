import Link from "next/link"
import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { ArrowRight } from "lucide-react"
import { Header } from "@/components/layout/header"
import { cn } from "@/lib/utils"

type ModuleStat = {
  label: string
  value: string
  detail: string
}

type ModuleAction = {
  label: string
  description: string
  href: string
  icon: LucideIcon
}

type ModulePageProps = {
  title: string
  subtitle: string
  summary: string
  eyebrow: string
  callout: string
  stats?: ModuleStat[]
  actions?: ModuleAction[]
  children?: ReactNode
}

export function ModulePage({
  title,
  subtitle,
  summary,
  eyebrow,
  callout,
  stats = [],
  actions = [],
  children,
}: ModulePageProps) {
  return (
    <section className="space-y-6">
      <Header title={title} subtitle={subtitle} />
      <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-gray-400">
              {eyebrow}
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 md:text-3xl">
              {summary}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-gray-500">{callout}</p>
          </div>
          <div className="rounded-2xl bg-[var(--color-primary-soft)] px-4 py-3 text-sm font-semibold text-[var(--color-primary)]">
            GreatGo
          </div>
        </div>
      </div>
      {stats.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">{stat.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-gray-900">{stat.value}</p>
              <p className="mt-2 text-sm leading-6 text-gray-400">{stat.detail}</p>
            </div>
          ))}
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  "group rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[color:var(--color-primary)] hover:shadow-md",
                  action.label.length > 24 && "xl:col-span-2"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{action.label}</p>
                      <p className="mt-1 text-xs leading-5 text-gray-400">{action.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="mt-1 h-4 w-4 text-gray-300 transition group-hover:translate-x-0.5 group-hover:text-[var(--color-primary)]" />
                </div>
              </Link>
            )
          })}
        </div>
      ) : null}
      {children}
    </section>
  )
}
