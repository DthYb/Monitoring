/**
 * TaskFlow API — application Express.
 *
 * Volontairement minimaliste : l'objectif du cours est la chaîne
 * build → test → déploiement → monitoring, pas le code métier.
 *
 * Endpoints :
 *   GET    /api/tasks             liste des tâches
 *   POST   /api/tasks             { text, priority? } → 201 + tâche créée
 *   PATCH  /api/tasks/:id/toggle  bascule completed
 *   DELETE /api/tasks/:id         supprime la tâche → 204
 *   GET    /health                sonde de santé (utilisée par les jobs smoke-* du workflow Deploy et par blackbox_exporter)
 *   GET    /metrics               métriques Prometheus (cf. metrics.js)
 *
 * `createApp()` retourne une application NON démarrée : c'est ce qui permet
 * de la tester avec supertest sans ouvrir de port (cf. tests/app.test.js).
 */
import express from 'express'
import { metricsMiddleware, metricsHandler, setTasksGauge } from './metrics.js'

const PRIORITIES = ['low', 'medium', 'high']

/** Génère un identifiant court (suffisant pour un stockage en mémoire). */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 8)
}

/**
 * Crée l'application Express.
 * @param {object} [options]
 * @param {Array} [options.initialTasks] tâches initiales (pratique pour les tests)
 */
export function createApp({ initialTasks = [] } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json())

  // Le middleware de métriques doit être déclaré AVANT les routes
  // pour mesurer toutes les requêtes (y compris les 404).
  app.use(metricsMiddleware)

  // Stockage en mémoire : perdu au redémarrage. C'est voulu (pas de BDD dans ce cours).
  let tasks = [...initialTasks]
  setTasksGauge(tasks.length)

  // ── Santé ────────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: process.env.APP_VERSION || 'dev',
      env: process.env.APP_ENV || 'local',
      uptime: Math.round(process.uptime()),
    })
  })

  // ── Métriques Prometheus ─────────────────────────────────────────────────
  app.get('/metrics', metricsHandler)

  // ── Tâches ───────────────────────────────────────────────────────────────
  app.get('/api/tasks', (_req, res) => {
    res.json(tasks)
  })

  app.post('/api/tasks', (req, res) => {
    const { text, priority = 'medium' } = req.body ?? {}

    if (typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({ error: 'Le texte de la tâche est requis' })
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Priorité invalide (${PRIORITIES.join(', ')})` })
    }

    const task = {
      id: generateId(),
      text: text.trim(),
      priority,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    tasks = [...tasks, task]
    setTasksGauge(tasks.length)
    return res.status(201).json(task)
  })

  app.patch('/api/tasks/:id/toggle', (req, res) => {
    const task = tasks.find((t) => t.id === req.params.id)
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' })
    }
    const updated = { ...task, completed: !task.completed }
    tasks = tasks.map((t) => (t.id === updated.id ? updated : t))
    return res.json(updated)
  })

  app.delete('/api/tasks/:id', (req, res) => {
    const exists = tasks.some((t) => t.id === req.params.id)
    if (!exists) {
      return res.status(404).json({ error: 'Tâche introuvable' })
    }
    tasks = tasks.filter((t) => t.id !== req.params.id)
    setTasksGauge(tasks.length)
    return res.status(204).end()
  })

  // ── Route de démonstration pour les alertes (J4) ─────────────────────────
  // GET /api/boom renvoie toujours 500 : pratique pour faire monter le taux
  // d'erreur et déclencher l'alerte HighErrorRate pendant le TP.
  app.get('/api/boom', (_req, res) => {
    res.status(500).json({ error: 'Erreur volontaire (démo alerting)' })
  })

  // ── 404 JSON ─────────────────────────────────────────────────────────────
  app.use((_req, res) => {
    res.status(404).json({ error: 'Route inconnue' })
  })

  return app
}
