# ContainerRestarting (warning)

**Symptôme** : un conteneur du poste (stack monitoring) a redémarré plus de 3 fois en 15 min (cAdvisor).

**Vérifications**
1. `docker compose ps` puis `docker compose logs --tail=100 <service>`
2. Erreur de configuration ? (`promtool check config`, `amtool check-config`)

**Remédiation**
- Corriger la configuration, `docker compose up -d`

**Escalade** : si c'est Prometheus ou Alertmanager qui boucle, la surveillance est aveugle → priorité haute.
