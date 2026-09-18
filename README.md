# CloudOps Dashboard

Panel web profesional para planificar y analizar una propuesta de infraestructura Cloud basada en AWS.

## Tecnologias

- React + TypeScript + Vite
- Tailwind CSS (incluido como dependencia)
- React Router
- Lucide React
- Recharts

## Ejecucion

```bash
npm install
npm run dev
```

## Funcionalidades

- Dashboard con indicadores, grafico de costos y resumen de seguridad.
- Registro de propuestas Cloud con persistencia en `localStorage`, listado y eliminacion.
- Calculadora y distribucion de costos simulados.
- Visualizacion de infraestructura global, seguridad e IAM.
- Diagrama HTML de red: Internet, Route 53, CloudFront, VPC, EC2 y RDS.
- Catalogo AWS con buscador, filtros por categoria y vista de detalle.
- Reportes descargables, notificaciones y acciones de revision simuladas.
- Navegacion responsive entre los siete modulos.
