"use client"

import { useRef, useState } from "react"
import { Header } from "@/components/layout/header"
import { useParams, useRouter } from "next/navigation"
import {
  ChevronLeft, Download, Send, Calendar,
  TrendingUp, TrendingDown, MousePointer,
  DollarSign, BarChart2, Users, Target,
  Award, Smartphone, ArrowUpRight
} from "lucide-react"
import {
  LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts"

const weekData = [
  { day: "Seg", spend: 180, clicks: 520, conversions: 18 },
  { day: "Ter", spend: 195, clicks: 480, conversions: 21 },
  { day: "Qua", spend: 210, clicks: 610, conversions: 25 },
  { day: "Qui", spend: 185, clicks: 540, conversions: 19 },
  { day: "Sex", spend: 220, clicks: 680, conversions: 28 },
  { day: "Sáb", spend: 165, clicks: 490, conversions: 17 },
  { day: "Dom", spend: 145, clicks: 420, conversions: 15 },
]

const campaigns = [
  { name: "Conversão Verão", tag: "CONVERSÃO", tagColor: "bg-purple-100 text-purple-700", clicks: 1820, reach: 14200, impressions: 24500, spend: 580, best: true },
  { name: "Tráfego Loja", tag: "TRÁFEGO", tagColor: "bg-blue-100 text-blue-700", clicks: 1240, reach: 11800, impressions: 19800, spend: 420, best: false },
  { name: "Awareness Marca", tag: "AWARENESS", tagColor: "bg-yellow-100 text-yellow-700", clicks: 680, reach: 6450, impressions: 11900, spend: 240, best: false },
]

const placements = [
  { name: "Facebook Feed", impressions: "24.5K", clicks: "1.8K", cost: "R$ 520", share: "43.7%" },
  { name: "Instagram Feed", impressions: "18.2K", clicks: "1.2K", cost: "R$ 380", share: "32.4%" },
  { name: "Stories", impressions: "8.9K", clicks: "480", cost: "R$ 210", share: "15.9%" },
  { name: "Reels", impressions: "4.6K", clicks: "260", cost: "R$ 130", share: "8.0%" },
]

const insights = [
  { icon: Award, label: "Melhor campanha", value: "Conversão Verão", color: "text-yellow-500", bg: "bg-yellow-50" },
  { icon: Users, label: "Público dominante", value: "Feminino · 25–34 anos", color: "text-purple-500", bg: "bg-purple-50" },
  { icon: TrendingDown, label: "CPA melhorou", value: "R$ 8,67 vs R$ 10,20", color: "text-green-500", bg: "bg-green-50" },
  { icon: Smartphone, label: "Melhor canal", value: "Instagram Feed", color: "text-blue-500", bg: "bg-blue-50" },
  { icon: Target, label: "Melhor criativo", value: "Promoção Verão 2025", color: "text-red-500", bg: "bg-red-50" },
]

function KpiCard({ label, value, delta, positive }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      <div className={`flex items-center gap-1 text-xs font-medium ${positive ? "text-green-600" : "text-red-500"}`}>
        {positive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
        {delta}
      </div>
    </div>
  )
}

function MiniChart({ data, dataKey, color }: any) {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px" }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function ReportPreviewPage() {
  const router = useRouter()
  const reportRef = useRef<HTMLDivElement>(null)
  const [generating, setGenerating] = useState(false)

  async function handleGeneratePDF() {
    setGenerating(true)
    try {
      const html2canvas = (await import("html2canvas")).default
      const jsPDF = (await import("jspdf")).default

      const element = reportRef.current!
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF("p", "mm", "a4")
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = pdfHeight
      let position = 0
      const pageHeight = pdf.internal.pageSize.getHeight()

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pageHeight
      }

      pdf.save("relatorio-greatgo.pdf")
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F8FAFC]">
      <Header
        title="Preview do Relatório"
        subtitle="Visualize antes de enviar · Ana Beatriz · semana 03/03 – 09/03/2025"
      />

      <div className="flex flex-1 gap-6 p-8 pb-28">

        {/* Sidebar de Filtros */}
        <div className="w-72 flex-shrink-0 space-y-4">

          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center">
                <span className="text-white text-sm font-bold">AB</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ana Beatriz Santos</p>
                <p className="text-xs text-gray-400">Loja ModaFit</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              🟢 Ativo
            </span>
          </div>

          {/* Filtros */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Período</label>
              <div className="flex gap-2">
                <input type="date" defaultValue="2025-03-03" className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C1121F]" />
                <input type="date" defaultValue="2025-03-09" className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C1121F]" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Conta de anúncio</label>
              <select className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C1121F]">
                <option>act_2847193056</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Objetivo</label>
              <div className="space-y-2">
                {["Todos", "Tráfego", "Conversão", "Mensagens"].map((o, i) => (
                  <label key={o} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="radio" name="objective" defaultChecked={i === 0} className="text-[#C1121F]" />
                    {o}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Campanhas</label>
              <div className="space-y-2">
                {[
                  { name: "Conversão Verão", tag: "CONVERSÃO", color: "bg-purple-100 text-purple-700" },
                  { name: "Tráfego Loja", tag: "TRÁFEGO", color: "bg-blue-100 text-blue-700" },
                  { name: "Awareness Marca", tag: "AWARENESS", color: "bg-yellow-100 text-yellow-700" },
                ].map((c) => (
                  <label key={c.name} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" defaultChecked className="text-[#C1121F]" />
                    <span>{c.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.color}`}>{c.tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Conjuntos de anúncios</label>
              <select className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C1121F]">
                <option>3 de 6 selecionados</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Anúncios</label>
              <select className="w-full text-xs border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#C1121F]">
                <option>Todos os anúncios</option>
              </select>
            </div>

            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" defaultChecked className="text-[#C1121F]" />
                Comparar com período anterior
              </label>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Insights automáticos</span>
                <div className="w-8 h-4 bg-[#C1121F] rounded-full flex items-center justify-end px-0.5 cursor-pointer">
                  <div className="w-3 h-3 bg-white rounded-full" />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 pt-2 border-t border-gray-100">
              Última atualização: 09/03/2025 às 23:59
            </p>
          </div>
        </div>

        {/* Relatório */}
        <div className="flex-1 min-w-0" ref={reportRef}>

          {/* Header do Relatório */}
          <div className="bg-gradient-to-r from-[#C1121F] to-[#0d8ab5] rounded-2xl p-6 mb-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold">GreatGo</p>
                <p className="text-blue-100 text-sm">Relatório de Performance META Ads</p>
              </div>
              <div className="text-right text-sm">
                <p className="font-semibold">Ana Beatriz Santos · Loja ModaFit</p>
                <p className="text-blue-100">03/03 – 09/03/2025</p>
              </div>
            </div>
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-blue-400">
              <div className="text-xs"><span className="text-blue-200">Conta conectada</span><br /><span className="font-semibold">act_2847193056</span></div>
              <div className="text-xs"><span className="text-blue-200">Campanhas</span><br /><span className="font-semibold">3 ativas</span></div>
              <div className="text-xs"><span className="text-blue-200">Páginas</span><br /><span className="font-semibold">1 de 3</span></div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-5 gap-3 mb-4">
            <KpiCard label="Investimento" value="R$ 1.240" delta="↓ 14.8% vs ant." positive={false} />
            <KpiCard label="Impressões" value="56.200" delta="↑ 16.8% vs ant." positive={true} />
            <KpiCard label="Alcance" value="32.450" delta="↑ 12.3% vs ant." positive={true} />
            <KpiCard label="Cliques" value="3.740" delta="↑ 16.9% vs ant." positive={true} />
            <KpiCard label="CTR" value="6.65%" delta="↑ 0.8% vs ant." positive={true} />
          </div>

          {/* Visão Geral */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Visão Geral da Conta</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "Cliques", value: "3.740", icon: MousePointer, color: "text-blue-500" },
                { label: "Alcance", value: "32.450", icon: Users, color: "text-purple-500" },
                { label: "Impressões", value: "56.200", icon: BarChart2, color: "text-teal-500" },
                { label: "Conversas", value: "218", icon: ArrowUpRight, color: "text-green-500" },
                { label: "Engajamentos", value: "4.892", icon: TrendingUp, color: "text-orange-500" },
              ].map((item) => (
                <div key={item.label} className="text-center p-3 rounded-xl bg-gray-50">
                  <item.icon className={`w-5 h-5 mx-auto mb-2 ${item.color}`} />
                  <p className="text-lg font-bold text-gray-900">{item.value}</p>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Métricas Avançadas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Métricas Avançadas</h3>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: "CPC", value: "R$ 0,33", up: true },
                { label: "CPM", value: "R$ 22,07", up: true },
                { label: "Conversões", value: "143", up: true },
                { label: "CPA", value: "R$ 8,67", up: true },
                { label: "ROAS", value: "3.2x", up: true },
              ].map((m) => (
                <div key={m.label} className="border border-gray-100 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">{m.label}</p>
                  <p className="text-xl font-bold text-gray-900">{m.value}</p>
                  <span className={`text-xs font-medium ${m.up ? "text-green-600" : "text-red-500"}`}>
                    {m.up ? "↑" : "↓"} vs ant.
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Evolução por Período */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolução por Período</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Investimento", key: "spend", color: "#C1121F" },
                { label: "Cliques", key: "clicks", color: "#8B5CF6" },
                { label: "Conversões", key: "conversions", color: "#14BE82" },
              ].map((chart) => (
                <div key={chart.label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-medium text-gray-600 mb-2">{chart.label}</p>
                  <MiniChart data={weekData} dataKey={chart.key} color={chart.color} />
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de Campanhas */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Performance por Campanha</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Campanha", "Cliques", "Alcance", "Impressões", "Gasto"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${c.tagColor}`}>{c.tag}</span>
                        {c.best && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-50 text-yellow-600">⭐ Melhor</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-700">{c.clicks.toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{c.reach.toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">{c.impressions.toLocaleString("pt-BR")}</td>
                    <td className="px-5 py-3 text-sm text-gray-700">R$ {c.spend.toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold">
                  <td className="px-5 py-3 text-sm text-gray-900">Total</td>
                  <td className="px-5 py-3 text-sm text-gray-900">3.740</td>
                  <td className="px-5 py-3 text-sm text-gray-900">32.450</td>
                  <td className="px-5 py-3 text-sm text-gray-900">56.200</td>
                  <td className="px-5 py-3 text-sm text-gray-900">R$ 1.240</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Posicionamentos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Posicionamentos</h3>
            <div className="grid grid-cols-4 gap-3">
              {placements.map((p) => (
                <div key={p.name} className="border border-gray-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-3">{p.name}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Impressões</span><span className="font-medium">{p.impressions}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Cliques</span><span className="font-medium">{p.clicks}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Custo</span><span className="font-medium">{p.cost}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-500">Share</span><span className="font-bold text-[#C1121F]">{p.share}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demográfico */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Demográfico</h3>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-3">Gênero</p>
                <div className="space-y-2">
                  {[{ label: "Feminino", pct: 68 }, { label: "Masculino", pct: 32 }].map((g) => (
                    <div key={g.label}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{g.label}</span><span className="font-semibold">{g.pct}%</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-[#C1121F] h-2 rounded-full" style={{ width: `${g.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-3">Faixa etária</p>
                <div className="space-y-2">
                  {[
                    { label: "18–24", pct: 22 },
                    { label: "25–34", pct: 41 },
                    { label: "35–44", pct: 24 },
                    { label: "45–54", pct: 9 },
                    { label: "55+", pct: 4 },
                  ].map((a) => (
                    <div key={a.label}>
                      <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{a.label}</span><span className="font-semibold">{a.pct}%</span></div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="bg-purple-400 h-2 rounded-full" style={{ width: `${a.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Principais Anúncios */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Principais Anúncios</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { name: "Promoção Verão 2025", impressions: "24.5K", clicks: "1.8K", engagement: "4.2K", conversions: "62" },
                { name: "Nova Coleção ModaFit", impressions: "18.2K", clicks: "1.2K", engagement: "2.9K", conversions: "48" },
                { name: "Outlet Online", impressions: "13.5K", clicks: "740", engagement: "1.8K", conversions: "33" },
              ].map((ad) => (
                <div key={ad.name} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="h-24 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                    <span className="text-3xl">🖼️</span>
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-900 mb-2">{ad.name}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: "Impressões", value: ad.impressions },
                        { label: "Cliques", value: ad.clicks },
                        { label: "Engajamento", value: ad.engagement },
                        { label: "Conversões", value: ad.conversions },
                      ].map((m) => (
                        <div key={m.label} className="text-center bg-gray-50 rounded-lg p-1.5">
                          <p className="text-[10px] text-gray-500">{m.label}</p>
                          <p className="text-xs font-bold text-gray-900">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Insights Automáticos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Insights Automáticos</h3>
            <div className="grid grid-cols-5 gap-3">
              {insights.map((insight) => (
                <div key={insight.label} className={`${insight.bg} rounded-xl p-4 text-center`}>
                  <insight.icon className={`w-6 h-6 mx-auto mb-2 ${insight.color}`} />
                  <p className="text-xs font-semibold text-gray-700 mb-1">{insight.label}</p>
                  <p className="text-xs text-gray-600">{insight.value}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom Bar Fixo */}
      <div className="fixed bottom-0 left-[280px] right-0 bg-white border-t border-gray-100 shadow-lg px-8 py-4 flex items-center justify-between z-40">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 px-4 py-2.5 rounded-xl transition"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition">
            <Calendar className="w-4 h-4" />
            Agendar envio
          </button>
          <button className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition">
            <Send className="w-4 h-4" />
            Enviar por e-mail
          </button>
          <button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="flex items-center gap-2 bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            {generating ? "Gerando PDF..." : "Gerar e baixar PDF"}
          </button>
        </div>
      </div>

    </div>
  )
}
