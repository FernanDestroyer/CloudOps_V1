import type { AwsService } from './types'

export const awsServices: AwsService[] = [
  { name: 'Amazon EC2', category: 'Computacion', description: 'Capacidad de computo virtual escalable.', function: 'Ejecutar aplicaciones y APIs', usage: 'Activo', color: 'blue' },
  { name: 'Amazon S3', category: 'Almacenamiento', description: 'Almacenamiento de objetos seguro y durable.', function: 'Archivos, backups y recursos estaticos', usage: 'Activo', color: 'amber' },
  { name: 'Amazon RDS', category: 'Base de datos', description: 'Base de datos relacional administrada.', function: 'Persistir datos de la aplicacion', usage: 'Activo', color: 'indigo' },
  { name: 'AWS IAM', category: 'Seguridad', description: 'Gestion de identidades y permisos.', function: 'Controlar accesos y roles', usage: 'Configurado', color: 'green' },
  { name: 'Amazon VPC', category: 'Redes', description: 'Red virtual aislada en AWS.', function: 'Aislar y conectar recursos', usage: 'Activo', color: 'violet' },
  { name: 'Route 53', category: 'Redes', description: 'DNS escalable y administrado.', function: 'Resolver dominios y enrutar trafico', usage: 'Activo', color: 'cyan' },
  { name: 'CloudFront', category: 'Entrega de contenido', description: 'CDN global de baja latencia.', function: 'Distribuir contenido globalmente', usage: 'Activo', color: 'sky' }
]

export const costData = [
  { name: 'EC2', value: 142, color: '#2563eb' }, { name: 'RDS', value: 86, color: '#4f46e5' }, { name: 'S3', value: 34, color: '#f59e0b' }, { name: 'CloudFront', value: 24, color: '#06b6d4' }
]
