# HighErrorRate (warning)

**Symptôme** : plus de 5 % des requêtes de l'API renvoient une 5xx sur les 5 dernières minutes (`job:http_errors:ratio5m > 0.05`).

**Vérifications**
1. Grafana → dashboard *TaskFlow RED* → panel *Requêtes par route et statut* : quelle route ?
2. `sudo journalctl -u taskflow-api -n 100 | grep -i error`
3. Corrélation avec un déploiement récent (annotations)

**Remédiation**
- Régression applicative : rollback via le workflow Deploy
- Route `/api/boom` sollicitée (démo) : rien à faire, c'est volontaire

**Escalade** : si le taux dépasse 20 % ou dure plus de 30 min → traiter comme critical.
