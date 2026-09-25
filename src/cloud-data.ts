import { useEffect, useState } from 'react'
import type { Proposal } from './types'

export const PROPOSALS_KEY = 'cloudops-proposals'
export const ACTIVE_REGION_KEY = 'cloudops-active-region'
export const PROPOSALS_EVENT = 'proposals-updated'
export const SELECTED_PROPOSAL_KEY = 'cloudops-selected-proposal'
export const SELECTED_PROPOSAL_EVENT = 'selected-proposal-updated'

export const regions = [
  { code: 'us-east-1', name: 'N. Virginia', factor: 1, estimatedUsers: 100000, status: 'healthy' as const },
  { code: 'sa-east-1', name: 'Sao Paulo', factor: 1.25, estimatedUsers: 60000, status: 'healthy' as const },
  { code: 'eu-west-1', name: 'Ireland', factor: 1.1, estimatedUsers: 80000, status: 'review' as const },
]

export const serviceMonthlyRates: Record<string, number> = {
  'Amazon EC2': 70.81,
  'Amazon RDS': 86.14,
  'Amazon S3': 23,
  'AWS IAM': 0,
  'Amazon VPC': 32.4,
  'Route 53': 0.5,
  CloudFront: 24,
}

export const blankProposal: Proposal = {
  name: '',
  appType: 'Aplicacion web',
  description: '',
  region: 'us-east-1 (N. Virginia)',
  users: '1,000',
  availability: 'Alta disponibilidad (Multi-AZ)',
  services: ['Amazon EC2', 'Amazon RDS'],
  goal: 'Modernizacion de aplicacion',
}

const isProposal = (value: unknown): value is Proposal => {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<Proposal>
  return typeof item.name === 'string'
    && typeof item.region === 'string'
    && typeof item.users === 'string'
    && Array.isArray(item.services)
    && item.services.every(service => typeof service === 'string')
}

export function loadProposals(): Proposal[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROPOSALS_KEY) || '[]')
    return Array.isArray(parsed) ? parsed.filter(isProposal) : []
  } catch {
    return []
  }
}

export function saveProposals(items: Proposal[]) {
  localStorage.setItem(PROPOSALS_KEY, JSON.stringify(items))
  window.dispatchEvent(new Event(PROPOSALS_EVENT))
}

export function useProposals() {
  const [proposals, setProposals] = useState(loadProposals)

  useEffect(() => {
    const refresh = () => setProposals(loadProposals())
    window.addEventListener(PROPOSALS_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(PROPOSALS_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  return proposals
}

export function useSelectedProposal() {
  const proposals = useProposals()
  const [selectedId, setSelectedIdState] = useState(() => localStorage.getItem(SELECTED_PROPOSAL_KEY) || '')

  useEffect(() => {
    const refresh = () => setSelectedIdState(localStorage.getItem(SELECTED_PROPOSAL_KEY) || '')
    window.addEventListener(SELECTED_PROPOSAL_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(SELECTED_PROPOSAL_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  useEffect(() => {
    if (selectedId && !proposals.some(proposal => proposal.id === selectedId)) {
      localStorage.removeItem(SELECTED_PROPOSAL_KEY)
      setSelectedIdState('')
    }
  }, [proposals, selectedId])

  const setSelectedId = (id: string) => {
    if (id) localStorage.setItem(SELECTED_PROPOSAL_KEY, id)
    else localStorage.removeItem(SELECTED_PROPOSAL_KEY)
    setSelectedIdState(id)
    window.dispatchEvent(new Event(SELECTED_PROPOSAL_EVENT))
  }

  return { proposals, selectedId, setSelectedId }
}

export function parseUsers(value: string) {
  const parsed = Number(value.replace(/[^0-9]/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function estimateProposal(proposal: Proposal) {
  const userFactor = Math.max(1, Math.ceil(parseUsers(proposal.users) / 2500))
  const availabilityFactor = proposal.availability.includes('Critica')
    ? 2.4
    : proposal.availability.includes('Multi-AZ') ? 1.65 : 1
  const region = regions.find(item => proposal.region.startsWith(item.code)) ?? regions[0]
  const scalable = new Set(['Amazon EC2', 'Amazon RDS', 'Amazon S3', 'CloudFront'])
  const services = proposal.services.map(name => ({
    name,
    cost: (serviceMonthlyRates[name] ?? 0)
      * (scalable.has(name) ? userFactor : 1)
      * availabilityFactor
      * region.factor,
  }))
  return {
    services,
    monthly: services.reduce((total, service) => total + service.cost, 0),
    userFactor,
  }
}

export const money = (value: number) => `$${value.toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`

export function downloadReport(proposals: Proposal[], regionCode: string) {
  const estimates = proposals.map(proposal => ({ proposal, estimate: estimateProposal(proposal) }))
  const monthly = estimates.reduce((total, item) => total + item.estimate.monthly, 0)
  const details = estimates.length
    ? estimates.map(({ proposal, estimate }) => `- ${proposal.name}: ${money(estimate.monthly)} / mes (${proposal.services.join(', ')})`).join('\n')
    : '- Sin propuestas guardadas'
  const report = [
    'CloudOps Dashboard',
    `Generado: ${new Date().toLocaleString()}`,
    `Region activa: ${regionCode}`,
    `Propuestas: ${proposals.length}`,
    `Costo mensual estimado: ${money(monthly)}`,
    `Proyeccion anual: ${money(monthly * 12)}`,
    '',
    'Detalle de propuestas',
    details,
  ].join('\n')
  const url = URL.createObjectURL(new Blob([report], { type: 'text/plain' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'cloudops-reporte.txt'
  link.click()
  URL.revokeObjectURL(url)
}
