"use client"

import { MessageSquare, FileText, Send, Users } from "lucide-react"
import type {
  ReportSendMode,
} from "@/types/report.types"

type SendReportComposerProps = {
  mode: ReportSendMode
  message: string
  groupLabel?: string | null
  templateName?: string
  disabled?: boolean
  onModeChange: (mode: ReportSendMode) => void
  onMessageChange: (message: string) => void
}

const SEND_MODE_OPTIONS: Array<{
  mode: ReportSendMode
  title: string
  description: string
}> = [
  {
    mode: "PDF_AND_MESSAGE",
    title: "PDF + mensagem",
    description: "Envia o PDF completo e depois a mensagem resumida abaixo.",
  },
  {
    mode: "PDF_ONLY",
    title: "Apenas PDF",
    description: "Envia somente o documento em PDF no WhatsApp.",
  },
  {
    mode: "MESSAGE_ONLY",
    title: "Apenas mensagem",
    description: "Envia somente a mensagem de resumo em texto.",
  },
]

export function SendReportComposer({
  mode,
  message,
  groupLabel,
  templateName,
  disabled,
  onModeChange,
  onMessageChange,
}: SendReportComposerProps) {
  const showsPdf = mode === "PDF_AND_MESSAGE" || mode === "PDF_ONLY"
  const showsMessage = mode === "PDF_AND_MESSAGE" || mode === "MESSAGE_ONLY"

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-sm print:hidden">
      <div className="mb-5">
        <h3 className="text-lg font-bold text-gray-900">Personalizar envio</h3>
        <p className="text-sm text-gray-500">
          Escolha como o relatório sera enviado e revise o preview antes de disparar.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {SEND_MODE_OPTIONS.map((option) => (
          <button
            key={option.mode}
            type="button"
            disabled={disabled}
            onClick={() => onModeChange(option.mode)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
              mode === option.mode
                ? "border-[#C1121F]/20 bg-[#FFF5F6]"
                : "border-gray-200 bg-gray-50 hover:border-gray-300"
            } ${disabled ? "opacity-60" : ""}`}
          >
            <p className="text-sm font-semibold text-gray-900">{option.title}</p>
            <p className="mt-1 text-xs text-gray-500">{option.description}</p>
          </button>
        ))}
      </div>

      {showsMessage ? (
        <div className="mt-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Mensagem do WhatsApp
          </label>
          <textarea
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            disabled={disabled}
            rows={10}
            className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#C1121F] disabled:opacity-60"
          />
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
          Preview do envio
        </p>
        <div className="overflow-hidden rounded-[28px] border border-[#d8e3ec] bg-[#dfe8ef] shadow-inner">
          <div className="flex items-center justify-between border-b border-[#ced9e3] bg-[#f7fafc] px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366]/15 text-[#128C7E]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {groupLabel || "Grupo do cliente"}
                </p>
                <p className="text-xs text-slate-500">
                  {templateName?.trim()
                    ? `Template: ${templateName.trim()}`
                    : "Envio manual do relatório"}
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              Preview WhatsApp
            </span>
          </div>

          <div className="space-y-3 bg-[linear-gradient(180deg,#e9f1f7_0%,#dfe8ef_100%)] p-4">
            {showsPdf ? (
              <div className="ml-auto max-w-[320px] rounded-[22px] rounded-br-md bg-[#dcf8c6] p-3 shadow-sm">
                <div className="rounded-2xl border border-[#cfe6bf] bg-white px-4 py-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <FileText className="h-4 w-4 text-[#C1121F]" />
                    Relatório completo em PDF
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    O grupo recebera o documento anexado com a versao final do relatório.
                  </p>
                </div>
              </div>
            ) : null}
            {showsMessage ? (
              <div className="ml-auto max-w-[320px] rounded-[22px] rounded-br-md bg-[#dcf8c6] px-4 py-3 shadow-sm">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <MessageSquare className="h-4 w-4 text-[#128C7E]" />
                  Mensagem enviada
                </div>
                <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-700">
                  {message}
                </pre>
              </div>
            ) : null}
            {!showsPdf && !showsMessage ? (
              <div className="rounded-2xl bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
                Nenhum conteúdo selecionado para envio.
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <Send className="h-3.5 w-3.5" />
          O envio segue exatamente esta composição.
        </div>
      </div>
    </div>
  )
}
