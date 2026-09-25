# InstanceDown (critical)

**Symptôme** : Prometheus ne parvient plus à scraper une cible (`up == 0` depuis 1 min). Peut concerner l'API, node_exporter ou un exporter local.

**Vérifications**
1. Prometheus → *Status → Targets* : quelle cible, quelle erreur (`connection refused`, `timeout`, `no route`) ?
2. La VM répond-elle ? `ping <ip>` puis `ssh -i ~/.ssh/taskflow_lab ubuntu@<ip>`
3. Le service écoute-t-il ? `sudo ss -tlnp | grep -E '80|3000|9100'`

**Remédiation**
- Service arrêté : `sudo systemctl restart taskflow-api` ou `node_exporter`, puis `systemctl status`
- VM éteinte : `multipass start taskflow-web1`
- Pare-feu : `sudo ufw status` (ports 80 et 9100 doivent être ouverts)

**Escalade** : si la VM ne redémarre pas, recréer avec `lab-up.sh` puis relancer le workflow Deploy.
