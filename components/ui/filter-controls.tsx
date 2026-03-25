"use client"

import clsx from "clsx"
import { Check, ChevronDown, Search } from "lucide-react"
import {
  type ChangeEventHandler,
  type InputHTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"

export type FilterOption = {
  label: string
  value: string
}

type FilterSearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> & {
  value: string
  onChange: ChangeEventHandler<HTMLInputElement>
  className?: string
  inputClassName?: string
}

type FilterSelectProps = {
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  className?: string
  buttonClassName?: string
  dropdownClassName?: string
}

export function FilterLabel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <p
      className={clsx(
        "mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500",
        className
      )}
    >
      {children}
    </p>
  )
}

export function FilterSearchInput({
  className,
  inputClassName,
  ...props
}: FilterSearchInputProps) {
  return (
    <div className={clsx("relative min-w-[220px] flex-1", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        {...props}
        className={clsx(
          "w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-700 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] transition placeholder:text-slate-400 focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10",
          inputClassName
        )}
      />
    </div>
  )
}

export function FilterSelect({
  value,
  options,
  onChange,
  className,
  buttonClassName,
  dropdownClassName,
}: FilterSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)

    return () => {
      document.removeEventListener("mousedown", handlePointerDown)
    }
  }, [])

  const selectedOption =
    options.find((option) => option.value === value) ?? options[0]

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={clsx(
          "flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-[0_10px_30px_-22px_rgba(15,23,42,0.45)] transition hover:border-slate-300 focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10",
          buttonClassName
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedOption?.label ?? value}</span>
        <ChevronDown
          className={clsx(
            "h-4 w-4 flex-shrink-0 text-slate-400 transition",
            open && "rotate-180"
          )}
        />
      </button>

      {open ? (
        <div
          className={clsx(
            "absolute left-0 top-full z-30 mt-2 min-w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.55)]",
            dropdownClassName
          )}
          role="listbox"
        >
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value)
                  setOpen(false)
                }}
                className={clsx(
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition",
                  isSelected
                    ? "bg-[#C1121F] text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
                role="option"
                aria-selected={isSelected}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="h-4 w-4" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
