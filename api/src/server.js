/**
 * Point d'entrée de l'API TaskFlow.
 *
 * Variables d'environnement (injectées par le fichier .env généré par Ansible
 * et chargé par l'unité systemd `EnvironmentFile=`) :
 *   PORT         port d'écoute (défaut 3000)
 *   APP_VERSION  version déployée (= github.run_number du workflow Deploy), visible dans /health
 *   APP_ENV      staging | prod | local
 */
import { createApp } from './app.js'

const port = Number(process.env.PORT) || 3000
const app = createApp()

const server = app.listen(port, () => {
  console.log(
    `[taskflow-api] démarrée sur le port ${port} ` +
      `(version=${process.env.APP_VERSION || 'dev'}, env=${process.env.APP_ENV || 'local'})`
  )
})

// Arrêt propre : systemd envoie SIGTERM lors d'un restart/stop.
// On arrête d'accepter des connexions puis on laisse finir les requêtes en cours.
function shutdown(signal) {
  console.log(`[taskflow-api] ${signal} reçu, arrêt en cours…`)
  server.close(() => {
    console.log('[taskflow-api] arrêtée')
    process.exit(0)
  })
  // Filet de sécurité : arrêt forcé après 5 s
  setTimeout(() => process.exit(1), 5000).unref()
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
