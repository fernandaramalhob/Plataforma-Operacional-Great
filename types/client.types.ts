import type { ClientStatus } from "@prisma/client"

export type ClientStatusValue = ClientStatus

export type ClientCampaignLink = {
  id: string
}

export type ClientLinkedCampaign = {
  id: string
  clientId: string
  campaignIdMeta: string
  campaignName: string
  isActive: boolean
}

export type ClientFormValues = {
  name: string
  company: string
  email: string
  phone: string
  notes: string
  whatsappGroupId: string
  adAccountId?: string
  adAccountName?: string
  status?: ClientStatusValue
}

export type ClientLookupOption = {
  id: string
  name: string
}

export type ClientListItem = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  status: ClientStatusValue
  createdAt: string
  adAccountId: string | null
  campaigns: ClientCampaignLink[]
}

export type ClientDetail = {
  id: string
  name: string
  company: string | null
  email: string | null
  phone: string | null
  notes: string | null
  whatsappGroupId: string | null
  adAccountId: string | null
  adAccountName: string | null
  status: ClientStatusValue
  createdAt: string
  campaigns: ClientLinkedCampaign[]
}

export type ClientMetaProfileOption = {
  id: string
  name: string
}

export type ClientMetaBrandOption = {
  id: string
  name: string
  displayName: string
  businessName: string | null
  adAccountId: string
  adAccountName: string
  accountStatus: number | null
}

export type ClientMetaOptionsResponse = {
  profiles: ClientMetaProfileOption[]
  brands: ClientMetaBrandOption[]
}

export type ImportClientRequest = {
  adAccountId: string
  adAccountName: string
}
