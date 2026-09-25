import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, ArrowRight, Boxes, Cloud, Database, DollarSign, Download, Globe2, LockKeyhole, MapPin, Network, Router, Save, Server, Shield, ShieldCheck, Trash2, Wifi } from 'lucide-react'
import { Header, SectionTitle, StatCard, StatusBadge } from './components'
import { awsServices, costData } from './data'
import type { Proposal } from './types'
import {
  ACTIVE_REGION_KEY,
  blankProposal,
  downloadReport,
  estimateProposal,
  money,
  regions,
  saveProposals,
  serviceMonthlyRates,
  useProposals,
  useSelectedProposal,
} from './cloud-data'

const regionLabel = (code: string) => `${code} (${regions.find(region => region.code === code)?.name ?? regions[0].name})`

export function CloudDashboard() {
  const go = useNavigate()
  const { proposals, selectedId } = useSelectedProposal()
  const [regionCode, setRegionCode] = useState(() => localStorage.getItem(ACTIVE_REGION_KEY) || regions[0].code)
  const region = regions.find(item => item.code === regionCode) ?? regions[0]
  const selectedProposals = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const selectedProposal = selectedProposals[0]
  const monthly = selectedProposals.reduce((total, proposal) => total + estimateProposal(proposal).monthly, 0)
  const services = new Set(selectedProposals.flatMap(proposal => proposal.services)).size
  const selectedServices = new Set(selectedProposals.flatMap(proposal => proposal.services))
  const activeRegions = [...new Set(selectedProposals.map(proposal => proposal.region.split(' ')[0]))]
  const securityChecks = [selectedServices.has('AWS IAM'), selectedServices.has('Amazon VPC'), selectedServices.has('Amazon S3') || selectedServices.has('Amazon RDS')]
  const securityScore = selectedProposals.length ? Math.round(securityChecks.filter(Boolean).length / securityChecks.length * 100) : 0
  const resilientPlans = selectedProposals.filter(proposal => proposal.availability.includes('Multi-AZ') || proposal.availability.includes('Multi-region')).length
  const infrastructureHealthy = selectedProposals.length > 0 && selectedServices.has('Amazon VPC')
  const serviceTotals = selectedProposals.flatMap(proposal => estimateProposal(proposal).services).reduce<Record<string, number>>((totals, service) => {
    totals[service.name] = (totals[service.name] ?? 0) + service.cost
    return totals
  }, {})
  const pieData = Object.entries(serviceTotals).filter(([, cost]) => cost > 0).map(([name, cost], index) => ({ name, cost, color: costData[index % costData.length].color }))
  const barData = selectedId
    ? pieData
    : selectedProposals.map(proposal => ({ name: proposal.name, cost: estimateProposal(proposal).monthly }))
  const selectRegion = (code: string) => {
    setRegionCode(code)
    localStorage.setItem(ACTIVE_REGION_KEY, code)
  }

  return <>
    <Header title="Vista general" subtitle="Indicadores calculados desde tus propuestas cloud." action={<>
      <label className="region-selector"><MapPin size={16}/><select value={regionCode} onChange={event => selectRegion(event.target.value)}>{regions.map(item => <option value={item.code} key={item.code}>{item.code} · {item.name}</option>)}</select></label>
      <button className="btn" onClick={() => downloadReport(proposals, regionCode)}><Download size={16}/> Exportar reporte</button>
    </>}/>
    <main>
      <section className="stat-grid">
        <StatCard label="Planificaciones analizadas" value={String(selectedProposals.length)} change={selectedId ? selectedProposal?.name ?? 'Seleccion individual' : 'Vista general consolidada'} icon={Cloud}/>
        <StatCard label="Costo mensual" value={money(monthly)} change={`${money(monthly * 12)} al año`} icon={DollarSign} tone="amber"/>
        <StatCard label="Servicios unicos" value={String(services)} change={services ? 'Configurados en propuestas' : 'Sin servicios configurados'} icon={Network} tone="violet"/>
        <StatCard label="Postura de seguridad" value={`${securityScore}%`} change={`${securityChecks.filter(check => !check).length} controles por completar`} icon={ShieldCheck} tone="green"/>
      </section>
      <section className="status-grid dashboard-statuses">
        <article className="panel status-card"><div className="status-icon blue"><MapPin size={20}/></div><div><p>ESTADO DE INFRAESTRUCTURA</p><h2>{infrastructureHealthy ? 'Activa y aislada' : selectedProposals.length ? 'Configuracion parcial' : 'Sin planificar'}</h2><span>{activeRegions.length ? `${activeRegions.length} region(es): ${activeRegions.join(', ')}` : 'No hay regiones configuradas'}</span></div><StatusBadge status={infrastructureHealthy ? 'healthy' : 'review'}/></article>
        <article className="panel status-card"><div className="status-icon green"><ShieldCheck size={20}/></div><div><p>COBERTURA DE SEGURIDAD</p><h2>{securityScore >= 100 ? 'Protegida' : securityScore >= 67 ? 'En progreso' : 'Requiere atencion'}</h2><span>{securityChecks.filter(Boolean).length} de {securityChecks.length} controles base cubiertos</span></div><StatusBadge status={securityScore >= 100 ? 'healthy' : securityScore > 0 ? 'review' : 'alert'}/></article>
        <article className="panel status-card"><div className="status-icon violet"><Network size={20}/></div><div><p>DISPONIBILIDAD</p><h2>{resilientPlans === selectedProposals.length && resilientPlans > 0 ? 'Alta disponibilidad' : resilientPlans > 0 ? 'Cobertura parcial' : 'Disponibilidad estandar'}</h2><span>{resilientPlans} de {selectedProposals.length} planificaciones con redundancia</span></div><StatusBadge status={resilientPlans === selectedProposals.length && resilientPlans > 0 ? 'healthy' : 'review'}/></article>
      </section>
      <section className="dashboard-grid">
        <article className="panel bar-chart dashboard-bar">
          <SectionTitle title={selectedId ? 'Costo por servicio' : 'Costo por planificacion'} detail={selectedId ? selectedProposal?.name : 'Vista general de todas las planificaciones'} action={<button className="text-btn" onClick={() => go('/costs')}>Analizar costos <ArrowRight size={15}/></button>}/>
          {monthly > 0 ? <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis tickFormatter={value => `$${value}`} axisLine={false} tickLine={false}/><Tooltip formatter={value => money(Number(value))}/><Bar dataKey="cost" fill="#2563eb" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div> : <div className="logic-empty"><Cloud size={32}/><b>Aun no hay datos para visualizar</b><span>Crea una planificacion para calcular sus indicadores.</span><button className="btn" onClick={() => go('/planning')}>Crear planificacion</button></div>}
          <div className="chart-summary"><div><span>Costo actual</span><b>{money(monthly)}</b></div><div><span>Proyeccion anual</span><b>{money(monthly * 12)}</b></div><div><span>Region activa</span><b>{region.code}</b></div></div>
        </article>
        <article className="panel donut dashboard-donut">
          <SectionTitle title="Distribucion de costos" detail={selectedId ? `Servicios de ${selectedProposal?.name}` : 'Servicios de todas las planificaciones'}/>
          <div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={pieData} dataKey="cost" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>{pieData.map(item => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer><div className="donut-total"><b>{money(monthly)}</b><small>/ mes</small></div></div>
          <div className="legend">{pieData.map(item => <div key={item.name}><i style={{ background: item.color }}/>{item.name}<b>{money(item.cost)}</b></div>)}</div>
          {!pieData.length && <p className="empty">No hay costos de servicios para distribuir.</p>}
        </article>
      </section>
      <section className="panel proposals dashboard-plans"><SectionTitle title={selectedId ? 'Planificacion seleccionada' : 'Resumen de planificaciones'} detail={selectedId ? 'La seleccion se aplica en todos los apartados' : `${proposals.length} planificaciones en la vista general`} action={<button className="text-btn" onClick={() => go('/planning')}>Administrar <ArrowRight size={15}/></button>}/><div className="proposal-list">{selectedProposals.slice(0, 6).map(proposal => <article key={proposal.id ?? proposal.name}><div><b>{proposal.name}</b><span>{proposal.region} · {proposal.services.length} servicios</span></div><strong>{money(estimateProposal(proposal).monthly)}</strong></article>)}</div>{!selectedProposals.length && <p className="empty">No existen planificaciones guardadas.</p>}</section>
    </main>
  </>
}

export function CloudPlanning() {
  const activeRegion = localStorage.getItem(ACTIVE_REGION_KEY) || regions[0].code
  const proposals = useProposals()
  const [proposal, setProposal] = useState<Proposal>({ ...blankProposal, region: regionLabel(activeRegion) })
  const [message, setMessage] = useState('')
  const preview = estimateProposal(proposal)
  const update = (key: keyof Proposal, value: string | string[]) => setProposal(current => ({ ...current, [key]: value }))
  const toggleService = (service: string) => update('services', proposal.services.includes(service) ? proposal.services.filter(item => item !== service) : [...proposal.services, service])
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!proposal.name.trim()) return setMessage('Ingresa un nombre para la propuesta.')
    if (!proposal.services.length) return setMessage('Selecciona al menos un servicio AWS.')
    saveProposals([{ ...proposal, id: crypto.randomUUID(), createdAt: new Date().toLocaleString() }, ...proposals])
    setProposal({ ...blankProposal, region: regionLabel(activeRegion) })
    setMessage('Propuesta guardada e incluida en los indicadores.')
  }
  const remove = (id?: string) => {
    saveProposals(proposals.filter(item => item.id !== id))
    setMessage('Propuesta eliminada y costos recalculados.')
  }

  return <><Header title="Planificacion cloud" subtitle="Diseña propuestas con una estimacion mensual inmediata." showPlanningSelector={false}/><main>
    <div className="planning-grid">
      <form className="panel form-panel" onSubmit={submit}>
        <SectionTitle title="Nueva propuesta" detail="Los cambios actualizan la estimacion en tiempo real."/>
        <div className="active-region-note"><MapPin size={17}/><span>Region activa: <b>{activeRegion} · {regions.find(item => item.code === activeRegion)?.name}</b></span></div>
        <div className="form-grid">
          <label>Nombre de la solucion<input required value={proposal.name} onChange={event => update('name', event.target.value)}/></label>
          <label>Tipo de aplicacion<select value={proposal.appType} onChange={event => update('appType', event.target.value)}><option>Aplicacion web</option><option>API empresarial</option><option>Plataforma de datos</option></select></label>
          <label>Region<select value={proposal.region} onChange={event => update('region', event.target.value)}>{regions.map(region => <option key={region.code}>{regionLabel(region.code)}</option>)}</select></label>
          <label>Usuarios estimados<input inputMode="numeric" value={proposal.users} onChange={event => update('users', event.target.value)}/></label>
          <label className="span-2">Disponibilidad<select value={proposal.availability} onChange={event => update('availability', event.target.value)}><option>Disponibilidad estandar</option><option>Alta disponibilidad (Multi-AZ)</option><option>Critica (Multi-region)</option></select></label>
          <label className="span-2">Descripcion<textarea value={proposal.description} onChange={event => update('description', event.target.value)}/></label>
        </div>
        <p className="field-title">Servicios AWS incluidos</p>
        <div className="service-picker">{awsServices.map(service => <label className={proposal.services.includes(service.name) ? 'selected' : ''} key={service.name}><input type="checkbox" checked={proposal.services.includes(service.name)} onChange={() => toggleService(service.name)}/><span>{service.name}</span></label>)}</div>
        <div className="estimate logic-estimate"><span>Estimacion mensual</span><h2>{money(preview.monthly)}</h2><small>{proposal.services.length} servicios · escala de carga x{preview.userFactor}</small></div>
        <button className="full-btn" type="submit"><Save size={17}/> Guardar propuesta</button>
      </form>
      <aside className="panel proposal-summary"><SectionTitle title="Criterios del calculo" detail="Factores del borrador y catalogo completo de precios."/><div className="logic-factors"><span>Usuarios<b>x{preview.userFactor}</b></span><span>Disponibilidad<b>{proposal.availability.includes('Critica') ? 'Multi-region' : proposal.availability.includes('Multi-AZ') ? 'Multi-AZ' : 'Estandar'}</b></span><span>Region<b>{proposal.region.split(' ')[0]}</b></span></div><div className="price-card-grid">{awsServices.map(service => <article className="price-card" key={service.name}><div><Boxes size={17}/><b>{service.name}</b></div><span>{service.description}</span><span>Tarifa base mensual <strong>{money(serviceMonthlyRates[service.name] ?? 0)}</strong></span></article>)}</div><p className="empty">Estas tarjetas son informativas. La selección de servicios se realiza únicamente en el formulario.</p></aside>
    </div>
    <section className="panel proposals"><SectionTitle title="Propuestas guardadas" detail={`${proposals.length} soluciones incluidas en el dashboard`}/><div className="proposal-list">{proposals.map(item => <article key={item.id ?? item.name}><div><b>{item.name}</b><span>{item.region} · {item.services.join(', ')}</span><small>{item.createdAt}</small></div><div className="proposal-actions"><strong>{money(estimateProposal(item).monthly)} / mes</strong><button className="delete-btn" onClick={() => remove(item.id)}><Trash2 size={14}/> Eliminar</button></div></article>)}</div>{!proposals.length && <p className="empty">Aun no hay propuestas guardadas.</p>}</section>
    {message && <div className="action-message">{message}<button onClick={() => setMessage('')}>Cerrar</button></div>}
  </main></>
}

export function CloudCosts() {
  const { proposals, selectedId } = useSelectedProposal()
  const [service, setService] = useState('Amazon EC2')
  const [quantity, setQuantity] = useState(2)
  const [hours, setHours] = useState(730)
  const selectedProposals = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const selected = selectedProposals[0]
  const totals = selectedProposals.flatMap(proposal => estimateProposal(proposal).services).reduce<Record<string, number>>((result, item) => {
    result[item.name] = (result[item.name] ?? 0) + item.cost
    return result
  }, {})
  const serviceData = Object.entries(totals).filter(([, cost]) => cost > 0).map(([name, cost], index) => ({ name, cost, color: costData[index % costData.length].color }))
  const proposalTotal = selectedProposals.reduce((total, proposal) => total + estimateProposal(proposal).monthly, 0)
  const hourlyRate = (serviceMonthlyRates[service] ?? 0) / 730
  const simulated = hourlyRate * quantity * Math.min(744, hours)

  return <><Header title="Costos y economia" subtitle="Analiza propuestas y compara escenarios de uso." action={<button className="btn" onClick={() => downloadReport(proposals, localStorage.getItem(ACTIVE_REGION_KEY) || regions[0].code)}><Download size={16}/> Descargar reporte</button>}/><main>
    <section className="panel calculator simulator"><SectionTitle title="Simulador de escenarios" detail="Compara un recurso adicional con el costo de una propuesta."/><div className="form-grid">
      <div className="estimate compact-estimate"><span>Alcance seleccionado</span><b>{selectedId ? selected?.name : 'Vista general'}</b><small>{selectedProposals.length} planificacion(es)</small></div>
      <label>Servicio<select value={service} onChange={event => setService(event.target.value)}>{Object.keys(serviceMonthlyRates).filter(name => serviceMonthlyRates[name] > 0).map(name => <option key={name}>{name}</option>)}</select></label>
      <label>Cantidad<input type="number" min="1" value={quantity} onChange={event => setQuantity(Math.max(1, Number(event.target.value) || 1))}/></label>
      <label>Horas mensuales<input type="number" min="1" max="744" value={hours} onChange={event => setHours(Math.min(744, Math.max(1, Number(event.target.value) || 1)))}/></label>
    </div><div className="scenario-total"><span>Propuesta: <b>{money(proposalTotal)}</b></span><ArrowRight size={17}/><span>Con escenario: <b>{money(proposalTotal + simulated)}</b></span><small>Impacto +{money(simulated)} / mes</small></div></section>
    <section className="costs-grid simulation-charts">
      <article className="panel donut"><SectionTitle title="Distribucion de la propuesta" detail={selected?.name ?? 'Crea una propuesta para ver su distribucion'}/><div className="donut-wrap"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={serviceData} dataKey="cost" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={4}>{serviceData.map(item => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip formatter={value => money(Number(value))}/></PieChart></ResponsiveContainer><div className="donut-total"><b>{money(proposalTotal)}</b><small>/ mes</small></div></div><div className="legend">{serviceData.map(item => <div key={item.name}><i style={{ background: item.color }}/>{item.name}<b>{money(item.cost)}</b></div>)}</div></article>
      <article className="panel bar-chart"><SectionTitle title="Costo por servicio" detail="Desglose calculado de la propuesta seleccionada"/><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={serviceData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" axisLine={false} tickLine={false}/><YAxis tickFormatter={value => `$${value}`} axisLine={false} tickLine={false}/><Tooltip formatter={value => money(Number(value))}/><Bar dataKey="cost" fill="#2563eb" radius={[6, 6, 0, 0]}/></BarChart></ResponsiveContainer></div></article>
    </section>
  </main></>
}

export function CloudInfrastructure() {
  const { proposals, selectedId } = useSelectedProposal()
  const scoped = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const grouped = regions.map(region => {
    const plans = scoped.filter(proposal => proposal.region.startsWith(region.code))
    return { ...region, plans, services: [...new Set(plans.flatMap(proposal => proposal.services))] }
  }).filter(region => region.plans.length > 0)

  return <><Header title="Infraestructura global" subtitle="Regiones y recursos derivados de la planificacion seleccionada."/><main>
    <section className="world panel"><div className="world-copy"><p className="eyebrow">{selectedId ? 'PLANIFICACION SELECCIONADA' : 'VISTA GENERAL'}</p><h2>{grouped.length ? `${grouped.length} region(es) configuradas` : 'Sin infraestructura planificada'}</h2><p>{selectedId ? scoped[0]?.name : 'Consolidado de todas las planificaciones guardadas'}.</p></div><div className="map-art"><Globe2 size={188}/></div></section>
    <section className="region-grid">{grouped.map(region => <article className="panel region" key={region.code}><div className="region-top"><span><MapPin size={19}/></span><StatusBadge status={region.status}/></div><p>{region.code}</p><h2>{region.name}</h2><div><small>PLANIFICACIONES</small><b>{region.plans.map(plan => plan.name).join(', ')}</b></div><div><small>SERVICIOS CONFIGURADOS</small><b>{region.services.length} servicios</b></div><div className="resource-tags">{region.services.map(service => <span key={service}>{service}</span>)}</div></article>)}</section>
    {!grouped.length && <section className="panel logic-empty"><MapPin size={32}/><b>No hay regiones para mostrar</b><span>Crea una planificacion o selecciona la vista general.</span></section>}
  </main></>
}

export function CloudSecurity() {
  const { proposals, selectedId } = useSelectedProposal()
  const scoped = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const services = new Set(scoped.flatMap(proposal => proposal.services))
  const has = (service: string) => services.has(service)
  const controls = [
    { title: 'Identidad y acceso', healthy: has('AWS IAM'), icon: LockKeyhole, description: has('AWS IAM') ? 'AWS IAM esta incluido para administrar usuarios, roles y permisos.' : 'La planificacion no incluye AWS IAM para controlar accesos.', recommendation: 'Incluye AWS IAM y aplica privilegio minimo con MFA.' },
    { title: 'Proteccion de datos', healthy: has('Amazon S3') || has('Amazon RDS'), icon: Shield, description: has('Amazon S3') || has('Amazon RDS') ? 'La arquitectura contiene servicios de datos que requieren cifrado y respaldos.' : 'No se detectaron servicios persistentes de datos.', recommendation: 'Configura cifrado, retencion y copias de seguridad.' },
    { title: 'Aislamiento de red', healthy: has('Amazon VPC'), icon: Network, description: has('Amazon VPC') ? 'Amazon VPC proporciona aislamiento logico a los recursos planificados.' : 'Los recursos no tienen una VPC declarada en la planificacion.', recommendation: 'Agrega Amazon VPC y separa subredes publicas y privadas.' },
    { title: 'Alta disponibilidad', healthy: scoped.length > 0 && scoped.every(proposal => !proposal.availability.includes('estandar')), icon: Activity, description: scoped.some(proposal => proposal.availability.includes('Multi-AZ') || proposal.availability.includes('Multi-region')) ? 'Se detecto redundancia Multi-AZ o Multi-region.' : 'La disponibilidad configurada es estandar.', recommendation: 'Usa Multi-AZ para cargas productivas criticas.' },
  ]
  const score = scoped.length ? controls.filter(control => control.healthy).length * 25 : 0

  return <><Header title="Centro de seguridad" subtitle="Controles evaluados según los servicios de la planificacion activa."/><main>
    <section className="security-banner"><div><span><ShieldCheck size={27}/></span><div><p>{selectedId ? scoped[0]?.name?.toUpperCase() : 'VISTA GENERAL'}</p><h2>{score >= 75 ? 'Postura protegida' : score >= 50 ? 'Requiere mejoras' : 'Configuracion incompleta'}</h2><small>{controls.filter(control => !control.healthy).length} controles requieren atencion</small></div></div><b>{score}<span>/100</span></b></section>
    <section className="security-grid">{controls.map(control => { const Icon = control.icon; return <article className="panel security-card" key={control.title}><div><span className={control.healthy ? 'healthy' : 'review'}><Icon size={20}/></span><StatusBadge status={control.healthy ? 'healthy' : 'review'}/></div><h2>{control.title}</h2><p>{control.description}</p>{!control.healthy && <div className="security-recommendation"><b>Recomendacion</b><span>{control.recommendation}</span></div>}</article> })}</section>
  </main></>
}

export function CloudNetwork() {
  const { proposals, selectedId } = useSelectedProposal()
  const scoped = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const services = new Set(scoped.flatMap(proposal => proposal.services))
  const edgeServices = ['Route 53', 'CloudFront'].filter(service => services.has(service))
  const computeServices = ['Amazon EC2'].filter(service => services.has(service))
  const dataServices = ['Amazon RDS', 'Amazon S3'].filter(service => services.has(service))
  const nodeCount = edgeServices.length + computeServices.length + dataServices.length + (services.has('Amazon VPC') ? 1 : 0)
  const activeRegions = [...new Set(scoped.map(proposal => proposal.region.split(' ')[0]))]
  const networkCoverage = [services.has('Route 53'), services.has('CloudFront'), services.has('Amazon VPC'), services.has('AWS IAM')].filter(Boolean).length
  const icons: Record<string, typeof Cloud> = { 'Route 53': Router, CloudFront: Wifi, 'Amazon VPC': Network, 'Amazon EC2': Server, 'Amazon RDS': Database, 'Amazon S3': Boxes }
  const descriptions: Record<string, string> = { 'Route 53': 'Resolucion DNS', CloudFront: 'Distribucion CDN', 'Amazon VPC': 'Red privada aislada', 'Amazon EC2': 'Capa de aplicacion', 'Amazon RDS': 'Base de datos relacional', 'Amazon S3': 'Almacenamiento de objetos' }
  const recommendations = [
    !services.has('Route 53') && 'Agrega Route 53 para administrar DNS y enrutamiento.',
    !services.has('CloudFront') && 'Agrega CloudFront para reducir latencia y proteger el origen.',
    !services.has('Amazon VPC') && 'Agrega Amazon VPC para aislar los recursos en una red privada.',
    !services.has('AWS IAM') && 'Agrega AWS IAM para controlar el acceso a los componentes.',
  ].filter((item): item is string => Boolean(item))
  const renderNode = (service: string) => { const Icon = icons[service] ?? Boxes; return <div className="layer-node" key={service}><span><Icon size={20}/></span><div><b>{service}</b><small>{descriptions[service]}</small></div><StatusBadge/></div> }

  return <><Header title="Arquitectura de red" subtitle="Flujo generado con los servicios de la planificacion seleccionada."/><main>
    <section className="stat-grid network-stats"><StatCard label="Componentes de red" value={String(nodeCount)} change={nodeCount ? 'Detectados en la seleccion' : 'Sin componentes'} icon={Network}/><StatCard label="Regiones" value={String(activeRegions.length)} change={activeRegions.join(', ') || 'Sin region activa'} icon={MapPin} tone="violet"/><StatCard label="Cobertura de red" value={`${networkCoverage}/4`} change={networkCoverage === 4 ? 'Arquitectura completa' : 'Hay mejoras disponibles'} icon={ShieldCheck} tone="green"/><StatCard label="Planificaciones" value={String(scoped.length)} change={selectedId ? scoped[0]?.name ?? 'Seleccion activa' : 'Vista general'} icon={Cloud} tone="amber"/></section>
    <section className="panel network-architecture"><SectionTitle title={selectedId ? scoped[0]?.name ?? 'Planificacion' : 'Topologia general'} detail="Arquitectura lógica organizada por capas"/>
      {scoped.length ? <div className="architecture-layers">
        <div className="architecture-entry"><div className="layer-node internet-node"><span><Globe2 size={21}/></span><div><b>Internet</b><small>Usuarios y clientes</small></div><StatusBadge/></div><ArrowRight/></div>
        <section className="architecture-layer edge-layer"><header><span>01</span><div><b>Perimetro y entrega</b><small>DNS, enrutamiento y distribución global</small></div></header><div className="layer-nodes">{edgeServices.length ? edgeServices.map(renderNode) : <p className="layer-empty">Sin servicios de perímetro</p>}</div></section>
        <ArrowRight className="layer-arrow"/>
        <section className={`architecture-layer vpc-layer ${services.has('Amazon VPC') ? 'active' : 'missing'}`}><header><span>02</span><div><b>Red privada</b><small>{services.has('Amazon VPC') ? 'Amazon VPC · subredes aisladas' : 'Amazon VPC no configurada'}</small></div></header><div className="vpc-zones"><div><p>SUBRED PÚBLICA</p><span>{edgeServices.includes('CloudFront') ? 'Entrada desde CloudFront' : 'Sin punto de entrada administrado'}</span></div><div><p>SUBRED PRIVADA</p><div className="layer-nodes">{computeServices.length ? computeServices.map(renderNode) : <p className="layer-empty">Sin capa de computo</p>}</div></div></div></section>
        <ArrowRight className="layer-arrow"/>
        <section className="architecture-layer data-layer"><header><span>03</span><div><b>Datos y persistencia</b><small>Servicios ubicados detrás de la aplicación</small></div></header><div className="layer-nodes">{dataServices.length ? dataServices.map(renderNode) : <p className="layer-empty">Sin servicios de datos</p>}</div></section>
      </div> : <div className="logic-empty"><Network size={32}/><b>Sin topologia disponible</b><span>Crea una planificacion para generar la arquitectura de red.</span></div>}
      <div className="network-footer"><span><ShieldCheck/> {services.has('Amazon VPC') ? 'Recursos aislados en Amazon VPC' : 'Aislamiento de red pendiente'}</span><span><LockKeyhole/> {services.has('AWS IAM') ? 'Accesos administrados con IAM' : 'Control de acceso pendiente'}</span></div>
    </section>
    <section className="panel network-advice"><SectionTitle title="Recomendaciones de arquitectura" detail={recommendations.length ? `${recommendations.length} mejoras detectadas` : 'La cobertura base esta completa'}/>{recommendations.length ? <div>{recommendations.map((recommendation, index) => <article key={recommendation}><span>{index + 1}</span><p>{recommendation}</p></article>)}</div> : <div className="network-complete"><ShieldCheck size={20}/><span>La selección incluye DNS, CDN, red privada y control de acceso.</span></div>}</section>
  </main></>
}

export function CloudServices() {
  const { proposals, selectedId } = useSelectedProposal()
  const scoped = selectedId ? proposals.filter(proposal => proposal.id === selectedId) : proposals
  const selectedNames = new Set(scoped.flatMap(proposal => proposal.services))
  const services = awsServices.filter(service => selectedNames.has(service.name))

  return <><Header title="Servicios AWS" subtitle="Catálogo limitado a los servicios de la planificacion seleccionada."/><main>
    <section className="selection-summary panel"><div><Boxes size={22}/><div><p className="eyebrow">{selectedId ? 'PLANIFICACION ACTIVA' : 'VISTA GENERAL'}</p><h2>{selectedId ? scoped[0]?.name : 'Todos los servicios planificados'}</h2></div></div><b>{services.length} servicios</b></section>
    <section className="service-grid dynamic-services">{services.map(service => <article className="service-card" key={service.name}><div className={`service-icon ${service.color}`}><Boxes size={19}/></div><div className="service-copy"><div className="service-title"><h3>{service.name}</h3><StatusBadge label={service.usage}/></div><span>{service.category}</span><dl><dt>Definicion</dt><dd>{service.description}</dd><dt>Funcion en la arquitectura</dt><dd>{service.function}</dd><dt>Precio base mensual</dt><dd>{money(serviceMonthlyRates[service.name] ?? 0)}</dd></dl></div></article>)}</section>
    {!services.length && <section className="panel logic-empty"><Boxes size={32}/><b>No hay servicios en esta seleccion</b><span>Agrega servicios a una planificacion para ver su definición y función.</span></section>}
  </main></>
}
