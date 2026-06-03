/** System Health mock data. Mirrors the shape a monitoring API would return. */

export type ServiceStatus = 'healthy' | 'warning' | 'offline'

export type ServiceHealth = {
  id: string
  name: string
  status: ServiceStatus
  /** Milliseconds; ignored when offline. */
  responseTimeMs: number
  lastChecked: string
}

export const services: ServiceHealth[] = [
  { id: 'frontend',   name: 'Frontend Website',    status: 'healthy', responseTimeMs: 128, lastChecked: '1 min ago' },
  { id: 'api',        name: 'API Gateway',         status: 'healthy', responseTimeMs: 92,  lastChecked: '1 min ago' },
  { id: 'database',   name: 'Database',            status: 'healthy', responseTimeMs: 41,  lastChecked: '1 min ago' },
  { id: 'tsim',       name: 'tSIM API',            status: 'warning', responseTimeMs: 540, lastChecked: '2 min ago' },
  { id: 'eximpe',     name: 'EximPe Gateway',      status: 'healthy', responseTimeMs: 210, lastChecked: '1 min ago' },
  { id: 'resend',     name: 'Resend Email',        status: 'healthy', responseTimeMs: 180, lastChecked: '3 min ago' },
  { id: 'fx',         name: 'Exchange Rate API',   status: 'healthy', responseTimeMs: 160, lastChecked: '4 min ago' },
  { id: 'geo',        name: 'IP Geolocation API',  status: 'offline', responseTimeMs: 0,   lastChecked: '6 min ago' },
  { id: 'chatbot',    name: 'AI Chatbot',          status: 'healthy', responseTimeMs: 230, lastChecked: '2 min ago' },
]

export const tsimMonitoring = {
  plansImported: 9327,
  coverageRecords: 1204,
  failedSyncs: 0,
  lastSync: '10 minutes ago',
}

export const revenueSnapshot = {
  today: '$1,284',
  weekly: '$8,940',
  monthly: '$45,230',
  ordersToday: 42,
}

export const orderHealth = {
  pending: 7,
  completed: 1284,
  failed: 3,
  refundRequests: 2,
}
