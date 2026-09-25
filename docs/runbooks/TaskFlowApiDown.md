# TaskFlowApiDown (critical)

**Symptôme** : la sonde blackbox sur `http://<ip>/health` échoue (`probe_success == 0`) depuis 1 min. Les utilisateurs ne peuvent plus utiliser TaskFlow.

**Vérifications**
1. `curl -i http://<ip>/health` : 502 → nginx OK mais API down ; timeout → nginx ou VM down
2. Sur la VM : `sudo systemctl status taskflow-api` et `sudo journalctl -u taskflow-api -n 50`
3. Un déploiement vient-il d'avoir lieu ? (annotation Grafana, onglet Actions → Deploy)

**Remédiation**
- API plantée : `sudo systemctl restart taskflow-api`
- Déploiement défectueux : rollback → Actions → Deploy → *Run workflow* → `rollback_to = <run précédent>`
- nginx : `sudo nginx -t && sudo systemctl reload nginx`

**Escalade** : ouvrir un post-mortem si l'indisponibilité dépasse 15 min (budget d'erreur SLO 99,5 %).
