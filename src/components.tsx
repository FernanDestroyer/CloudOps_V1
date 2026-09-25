import { type ComponentType, type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, Boxes, Calculator, CheckCircle2, ChevronRight, Cloud, Globe2, LayoutDashboard, Network, Plus, ShieldCheck, Waypoints } from 'lucide-react'
import type { AwsService, Status } from './types'
import { useSelectedProposal } from './cloud-data'

export const navItems = [
  ['Dashboard', '/dashboard', LayoutDashboard], ['Planificacion', '/planning', Plus], ['Costos', '/costs', Calculator], ['Infraestructura', '/infrastructure', Globe2], ['Seguridad', '/security', ShieldCheck], ['Red', '/network', Network], ['Servicios AWS', '/services', Boxes]
] as [string, string, ComponentType<{ size?: number; strokeWidth?: number }>][]

export function Sidebar() {
  return <aside className="sidebar"><div className="brand"><span className="brand-mark"><Cloud size={22}/></span><span>Cloud<span>Ops</span></span></div><div className="workspace">ESPACIO DE TRABAJO</div><nav>{navItems.map(([label, to, Icon]) => <NavLink key={to} to={to} className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-footer"><div className="avatar">AM</div><div><b>Alex Morgan</b><small>Cloud Architect</small></div><ChevronRight size={16}/></div></aside>
}

export function Header({ title, subtitle, action }: { title: string; subtitle: string; action?: ReactNode }) {
  const [showNotifications, setShowNotifications] = useState(false)
  const { proposals, selectedId, setSelectedId } = useSelectedProposal()
  return <header className="header"><div><p className="eyebrow">CLOUDOPS / PLATAFORMA</p><h1>{title}</h1><p className="subtitle">{subtitle}</p></div><div className="header-actions"><label className="planning-selector"><Waypoints size={16}/><span>Planificacion</span><select value={selectedId} onChange={event => setSelectedId(event.target.value)}><option value="">Vista general</option>{proposals.map(proposal => <option value={proposal.id} key={proposal.id ?? proposal.name}>{proposal.name}</option>)}</select></label>{action}<div className="notification-wrap"><button className="icon-btn" aria-label="Notificaciones" onClick={() => setShowNotifications(!showNotifications)}><Bell size={19}/><i/></button>{showNotifications && <div className="notifications"><b>Notificaciones</b><p><strong>Revision IAM</strong> Hay 2 usuarios sin MFA.</p><p><strong>Costos</strong> El gasto estimado subio 4.8%.</p></div>}</div></div></header>
}

const statusText: Record<Status, string> = { healthy: 'Operativo', review: 'En revision', alert: 'Atencion' }
export function StatusBadge({ status = 'healthy', label }: { status?: Status; label?: string }) { return <span className={`badge ${status}`}>{status === 'healthy' && <CheckCircle2 size={13}/>} {label ?? statusText[status]}</span> }

export function StatCard({ label, value, change, icon: Icon, tone = 'blue' }: { label:string; value:string; change:string; icon: ComponentType<{size?:number}>; tone?:string }) { return <article className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={20}/></div><p>{label}</p><h3>{value}</h3><small className={change.includes('+') ? 'positive' : ''}>{change}</small></article> }

export function ServiceCard({ service, onDetails }: { service: AwsService; onDetails?: (service: AwsService) => void }) { return <article className="service-card"><div className={`service-icon ${service.color}`}><Boxes size={19}/></div><div className="service-copy"><div className="service-title"><h3>{service.name}</h3><StatusBadge label={service.usage}/></div><span>{service.category}</span><p>{service.description}</p><button className="service-function" onClick={() => onDetails?.(service)}>Ver detalle <ChevronRight size={15}/></button></div></article> }

export function SectionTitle({ title, detail, action }: {title:string; detail?:string; action?:ReactNode}) { return <div className="section-title"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</div> }

export function CloudNode({ title, detail, icon: Icon, className = '' }: {title:string; detail:string; icon:ComponentType<{size?:number}>; className?:string}) { return <div className={`cloud-node ${className}`}><span><Icon size={21}/></span><b>{title}</b><small>{detail}</small></div> }
