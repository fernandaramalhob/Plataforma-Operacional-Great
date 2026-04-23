import { Eye, EyeOff, Loader2 } from "lucide-react"

type MetaTokenInputProps = {
  value: string
  showToken: boolean
  isSubmitting: boolean
  disabled?: boolean
  canSubmit?: boolean
  hasSavedToken: boolean
  placeholder?: string
  submitLabel?: string
  submittingLabel?: string
  onChange: (value: string) => void
  onToggleVisibility: () => void
  onSubmit: () => void
}

export function MetaTokenInput({
  value,
  showToken,
  isSubmitting,
  disabled,
  canSubmit,
  hasSavedToken,
  placeholder,
  submitLabel,
  submittingLabel,
  onChange,
  onToggleVisibility,
  onSubmit,
}: MetaTokenInputProps) {
  return (
    <>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        Novo token de acesso META
      </label>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <input
            type={showToken ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={placeholder ?? "EAAxxxxxxxxxxxxxxxx..."}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F]"
          />
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          >
            {showToken ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting || disabled || (canSubmit ?? !value)}
          className="flex items-center gap-2 whitespace-nowrap rounded-xl bg-[#C1121F] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {submittingLabel ?? "Salvando..."}
            </>
          ) : (
            submitLabel ?? (hasSavedToken ? "Atualizar token" : "Validar e Salvar")
          )}
        </button>
      </div>
    </>
  )
}
