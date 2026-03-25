"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { useParams } from "next/navigation"
import {
  ChevronLeft,
  Loader2,
  TrendingUp,
  MousePointer,
  DollarSign,
  BarChart2,
} from "lucide-react"
import Link from "next/link"
import { fetchJsonOrThrow } from "@/lib/api-client"
import type { ClientDetail } from "@/types/client.types"
import type { ReportCampaign } from "@/types/report.types"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
}

const colors = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-pink-500",
  "bg-teal-500",
]

function getColor(name: string) {
  return colors[name.charCodeAt(0) % colors.length]
}

export default function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [campaigns, setCampaigns] = useState<ReportCampaign[]>([])
  const [loadingClient, setLoadingClient] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    void fetchJsonOrThrow<ClientDetail>(
      `/api/clients/${id}`,
      undefined,
      "Erro ao buscar cliente"
    )
      .then((data) => setClient(data))
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error ? fetchError.message : "Erro ao buscar cliente"
        )
      })
      .finally(() => setLoadingClient(false))
  }, [id])

  useEffect(() => {
    void fetchJsonOrThrow<ReportCampaign[]>(
      `/api/clients/${id}/campaigns`,
      undefined,
      "Erro ao buscar campanhas"
    )
      .then((data) => setCampaigns(data))
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error ? fetchError.message : "Erro ao buscar campanhas"
        )
      })
      .finally(() => setLoadingCampaigns(false))
  }, [id])

  if (loadingClient) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
      </div>
    )
  }

  if (!client) {
    return (
      <>
        <Header title="Cliente" subtitle="Detalhe do cliente" />
        <div className="p-8">
          <Link
            href="/dashboard/clients"
            className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="h-4 w-4" />
            Voltar para Clientes
          </Link>
          <div className="rounded-2xl border border-gray-100 bg-white p-6 text-sm text-red-500 shadow-sm">
            {error || "Cliente nao encontrado."}
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header title={client.name} subtitle="Detalhe do cliente" />
      <div className="p-8">
        <Link
          href="/dashboard/clients"
          className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar para Clientes
        </Link>

        <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full ${getColor(client.name)}`}
            >
              <span className="text-lg font-bold text-white">
                {getInitials(client.name)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
              <p className="text-sm text-gray-400">
                {client.company ?? "-"} · {client.email ?? "-"}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                AdAccount: {client.adAccountId ?? "-"}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/clients/${id}/edit`}
            className="rounded-xl bg-[#C1121F] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#A50F1A]"
          >
            Editar Cliente
          </Link>
        </div>

        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-1 text-lg font-bold text-gray-900">Campanhas META Ads</h3>
          <p className="mb-6 text-sm text-gray-400">
            Dados da ultima semana via META Graph API
          </p>

          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#C1121F]" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">{error}</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-gray-400">
              <p className="text-sm">Nenhuma campanha encontrada nesta conta</p>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((campaign) => {
                const insights = campaign.insights?.data?.[0] ?? {}
                const spend = parseFloat(insights.spend ?? "0")
                const impressions = parseInt(insights.impressions ?? "0")
                const clicks = parseInt(insights.clicks ?? "0")
                const ctr =
                  impressions > 0
                    ? ((clicks / impressions) * 100).toFixed(2)
                    : "0.00"

                return (
                  <div
                    key={campaign.id}
                    className="rounded-2xl border border-gray-100 p-5"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{campaign.name}</p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {campaign.objective ?? "-"}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          campaign.status === "ACTIVE"
                            ? "bg-green-50 text-green-600"
                            : campaign.status === "PAUSED"
                              ? "bg-yellow-50 text-yellow-600"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {campaign.status === "ACTIVE"
                          ? "Ativa"
                          : campaign.status === "PAUSED"
                            ? "Pausada"
                            : campaign.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                      <div className="rounded-xl bg-blue-50 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-blue-500" />
                          <span className="text-xs font-medium text-blue-500">
                            Investimento
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          R${" "}
                          {spend.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      <div className="rounded-xl bg-purple-50 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <BarChart2 className="h-3.5 w-3.5 text-purple-500" />
                          <span className="text-xs font-medium text-purple-500">
                            Impressoes
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {impressions.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-teal-50 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <MousePointer className="h-3.5 w-3.5 text-teal-500" />
                          <span className="text-xs font-medium text-teal-500">
                            Cliques
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {clicks.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="rounded-xl bg-orange-50 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
                          <span className="text-xs font-medium text-orange-500">
                            CTR
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">{ctr}%</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
