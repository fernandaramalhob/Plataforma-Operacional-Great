export type EvolutionGroup = {
  id: string
  subject: string
  size: number
  announce: boolean
}

export type EvolutionSettingsResponse = {
  configured: boolean
  connected: boolean
  instance: string | null
  detail: string | null
  groups: EvolutionGroup[]
}
