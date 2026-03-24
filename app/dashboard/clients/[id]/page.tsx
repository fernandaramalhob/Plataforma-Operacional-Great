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

type Client = {
  id: string
  name: string
  company: string | null
  email: string | null
  adAccountId: string | null
}

type CampaignInsight = {
  spend?: string
  impressions?: string
  clicks?: string
}

type Campaign = {
  id: string
  name: string
  status: string
  objective?: string | null
  insights?: {
    data?: CampaignInsight[]
  }
}

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
  const [client, setClient] = useState<Client | null>(null)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loadingClient, setLoadingClient] = useState(true)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then(async (res) => {
        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Erro ao buscar cliente"
          )
        }

        setClient(data as Client)
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error ? fetchError.message : "Erro ao buscar cliente"
        )
      })
      .finally(() => setLoadingClient(false))
  }, [id])

  useEffect(() => {
    fetch(`/api/clients/${id}/campaigns`)
      .then(async (res) => {
        const data = await res.json()

        if (!res.ok) {
          throw new Error(
            typeof data?.error === "string" ? data.error : "Erro ao buscar campanhas"
          )
        }

        setCampaigns(Array.isArray(data) ? (data as Campaign[]) : [])
      })
      .catch((fetchError) => {
        setError(
          fetchError instanceof Error ? fetchError.message : "Erro ao buscar campanhas"
        )
      })
      .finally(() => setLoadingCampaigns(false))
  }, [id])

  if (loadingClient) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-[#C1121F]" />
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
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar para Clientes
          </Link>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-sm text-red-500">
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
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para Clientes
        </Link>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${getColor(client.name)}`}
            >
              <span className="text-white text-lg font-bold">
                {getInitials(client.name)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
              <p className="text-sm text-gray-400">
                {client.company ?? "-"} · {client.email ?? "-"}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                AdAccount: {client.adAccountId ?? "-"}
              </p>
            </div>
          </div>
          <Link
            href={`/dashboard/clients/${id}/edit`}
            className="bg-[#C1121F] hover:bg-[#A50F1A] text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            Editar Cliente
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-1">Campanhas META Ads</h3>
          <p className="text-sm text-gray-400 mb-6">
            Dados da ultima semana via META Graph API
          </p>

          {loadingCampaigns ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-[#C1121F]" />
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
                  <div key={campaign.id} className="border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{campaign.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {campaign.objective ?? "-"}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${
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

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-blue-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <DollarSign className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-xs text-blue-500 font-medium">
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
                      <div className="bg-purple-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <BarChart2 className="w-3.5 h-3.5 text-purple-500" />
                          <span className="text-xs text-purple-500 font-medium">
                            Impressoes
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {impressions.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="bg-teal-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MousePointer className="w-3.5 h-3.5 text-teal-500" />
                          <span className="text-xs text-teal-500 font-medium">
                            Cliques
                          </span>
                        </div>
                        <p className="text-lg font-bold text-gray-900">
                          {clicks.toLocaleString("pt-BR")}
                        </p>
                      </div>
                      <div className="bg-orange-50 rounded-xl p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <TrendingUp className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-xs text-orange-500 font-medium">
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
