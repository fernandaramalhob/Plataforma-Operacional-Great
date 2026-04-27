"use client"

import { Bookmark, BookmarkCheck, FileEdit, LayoutTemplate, Sparkles } from "lucide-react"
import type {
  ReportMetricKey,
  ReportMetricVisibility,
  ReportSectionKey,
  ReportSectionVisibility,
} from "@/types/report.types"

type ReportTemplateEditorProps = {
  templateName: string
  customTitle: string
  executiveSummary: string
  closingNotes: string
  sections: ReportSectionVisibility
  metrics: ReportMetricVisibility
  disabled?: boolean
  hasSavedTemplate?: boolean
  savedTemplateLabel?: string | null
  onTemplateNameChange: (value: string) => void
  onCustomTitleChange: (value: string) => void
  onExecutiveSummaryChange: (value: string) => void
  onClosingNotesChange: (value: string) => void
  onSectionToggle: (key: ReportSectionKey) => void
  onMetricToggle: (key: ReportMetricKey) => void
  onSaveTemplate: () => void
  onLoadTemplate: () => void
}

const SECTION_LABELS: Array<{
  key: ReportSectionKey
  title: string
  description: string
}> = [
  {
    key: "overview",
    title: "Visão geral",
    description: "Mantém os cards principais com os números consolidados.",
  },
  {
    key: "advancedMetrics",
    title: "Métricas detalhadas",
    description: "Exibe custos, conversas iniciadas e taxa de conversa.",
  },
  {
    key: "chart",
    title: "Gráfico",
    description: "Mostra a evolucao diaria ao longo do período.",
  },
  {
    key: "campaignTable",
    title: "Tabela de campanhas",
    description: "Inclui a tabela detalhada com as campanhas selecionadas.",
  },
  {
    key: "topAds",
    title: "Principais anúncios",
    description: "Mostra os anúncios com melhor volume no período.",
  },
  {
    key: "gender",
    title: "Gênero",
    description: "Inclui a quebra de resultados por gênero.",
  },
  {
    key: "insights",
    title: "Insights",
    description: "Apresenta destaques automáticos gerados pela plataforma.",
  },
  {
    key: "summary",
    title: "Resumo final",
    description: "Mantem o bloco de fechamento com os dados consolidados.",
  },
  {
    key: "notes",
    title: "Observações manuais",
    description: "Adiciona um bloco livre para contexto operacional.",
  },
]

const METRIC_LABELS: Array<{
  key: ReportMetricKey
  title: string
}> = [
  { key: "spend", title: "Investimento" },
  { key: "impressions", title: "Impressões" },
  { key: "reach", title: "Alcance" },
  { key: "clicks", title: "Cliques" },
  { key: "ctr", title: "Taxa de cliques" },
  { key: "cpc", title: "Custo por clique" },
  { key: "cpm", title: "Custo por mil impressões" },
  { key: "conversationsStarted", title: "Conversas iniciadas" },
  { key: "costPerConversation", title: "Custo por conversa" },
      { key: "conversationRate", title: "Taxa de conversa" },
]

export function ReportTemplateEditor({
  templateName,
  customTitle,
  executiveSummary,
  closingNotes,
  sections,
  metrics,
  disabled,
  hasSavedTemplate,
  savedTemplateLabel,
  onTemplateNameChange,
  onCustomTitleChange,
  onExecutiveSummaryChange,
  onClosingNotesChange,
  onSectionToggle,
  onMetricToggle,
  onSaveTemplate,
  onLoadTemplate,
}: ReportTemplateEditorProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Montagem do relatório</h3>
          <p className="mt-1 text-sm text-slate-500">
            Escolha com clareza o que entra no PDF e no envio.
          </p>
        </div>
        <div className="rounded-2xl bg-[#FFF5F6] p-3 text-[#C1121F]">
          <LayoutTemplate className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Identidade do relatório
          </p>
          <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
            Nome do template
            </label>
            <input
              value={templateName}
              onChange={(event) => onTemplateNameChange(event.target.value)}
              disabled={disabled}
              placeholder="Ex.: Semanal para grupo do cliente"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Titulo exibido no relatório
            </label>
            <input
              value={customTitle}
              onChange={(event) => onCustomTitleChange(event.target.value)}
              disabled={disabled}
              placeholder="Ex.: FACEBOOK - Visão Geral"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10 disabled:opacity-60"
            />
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Textos do relatório
          </p>
          <div className="mt-4 space-y-4">
          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <Sparkles className="h-4 w-4 text-[#C1121F]" />
              Resumo executivo
            </label>
            <textarea
              value={executiveSummary}
              onChange={(event) => onExecutiveSummaryChange(event.target.value)}
              disabled={disabled}
              rows={5}
              placeholder="Escreva a leitura principal que deve aparecer no relatório."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700">
              <FileEdit className="h-4 w-4 text-[#C1121F]" />
              Observações finais
            </label>
            <textarea
              value={closingNotes}
              onChange={(event) => onClosingNotesChange(event.target.value)}
              disabled={disabled}
              rows={4}
              placeholder="Adicione orientações, próximos passos ou recados para o cliente."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 transition focus:border-[#C1121F]/25 focus:outline-none focus:ring-4 focus:ring-[#C1121F]/10 disabled:opacity-60"
            />
          </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Secoes do relatório
          </p>
          <div className="mt-4 grid gap-2">
            {SECTION_LABELS.map((section) => (
              <label
                key={section.key}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={sections[section.key]}
                  onChange={() => onSectionToggle(section.key)}
                  disabled={disabled}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-[#C1121F] focus:ring-[#C1121F]"
                />
                <span className="block">
                  <span className="block text-sm font-semibold text-slate-800">
                    {section.title}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">
                    {section.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Métricas do relatório
          </p>
          <div className="mt-4 grid gap-2">
            {METRIC_LABELS.map((metric) => (
              <label
                key={metric.key}
                className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <input
                  type="checkbox"
                  checked={metrics[metric.key]}
                  onChange={() => onMetricToggle(metric.key)}
                  disabled={disabled}
                  className="h-4 w-4 rounded border-slate-300 text-[#C1121F] focus:ring-[#C1121F]"
                />
                <span className="text-sm font-semibold text-slate-800">
                  {metric.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Template salvo
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={disabled}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C1121F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A] disabled:opacity-60"
            >
              <Bookmark className="h-4 w-4" />
        Salvar template
            </button>
            <button
              type="button"
              onClick={onLoadTemplate}
              disabled={disabled || !hasSavedTemplate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <BookmarkCheck className="h-4 w-4" />
        Carregar template salvo
            </button>
          </div>

          <p className="mt-3 text-xs leading-5 text-slate-400">
            {hasSavedTemplate
      ? `Template salvo: ${savedTemplateLabel ?? "modelo do cliente"}`
      : "Nenhum template salvo para este cliente ainda."}
          </p>
        </div>
      </div>
    </section>
  )
}
