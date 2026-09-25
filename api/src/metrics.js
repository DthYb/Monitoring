/**
 * Instrumentation Prometheus de l'API TaskFlow (prom-client).
 * Expose les métriques RED : Rate, Errors, Duration + une gauge métier.
 */
import client from 'prom-client'

// Registre dédié : évite de mélanger avec un éventuel registre global d'une autre lib
export const register = new client.Registry()

// Métriques par défaut de Node : CPU process, mémoire, event loop lag, GC…
client.collectDefaultMetrics({ register })

// R — Rate : nombre de requêtes, par méthode / route / code HTTP
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Nombre total de requêtes HTTP',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

// D — Duration : histogramme des latences (en secondes, unité de base Prometheus)
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Durée des requêtes HTTP en secondes',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
})

// Gauge métier : combien de tâches en mémoire en ce moment
export const tasksGauge = new client.Gauge({
  name: 'taskflow_tasks_total',
  help: 'Nombre de tâches actuellement stockées',
  registers: [register],
})

export function setTasksGauge(n) {
  tasksGauge.set(n)
}

/** Middleware Express : mesure chaque requête (y compris les 404). */
export function metricsMiddleware(req, res, next) {
  const end = httpRequestDuration.startTimer()
  res.on('finish', () => {
    // req.route n'existe que si une route a matché : sinon on garde le chemin brut
    // (attention à la cardinalité : jamais d'ID dans le label route !)
    const route = req.route?.path ?? req.path
    const labels = { method: req.method, route, status_code: res.statusCode }
    httpRequestsTotal.inc(labels)
    end(labels)
  })
  next()
}

/** Handler de GET /metrics : format texte Prometheus. */
export async function metricsHandler(_req, res) {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
}
