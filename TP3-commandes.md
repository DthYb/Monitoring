# TP3 : Monitorer TaskFlow avec Prometheus et Grafana — liste de commandes

Le projet `taskflow-ops` contient déjà les fichiers de ce TP :

- `api/src/metrics.js` complété (Counter, Histogram, Gauge, middleware) + `api/tests/metrics.test.js`
- `ansible/roles/node_exporter/` complet (defaults, tasks, handlers, template systemd)
- `ansible/playbooks/monitoring.yml`
- `.github/workflows/monitoring.yml`
- `monitoring/prometheus/prometheus.yml` avec les jobs `node-local`, `taskflow-api`, `node-vms` (**IP à remplacer**, voir étape 4.1)

Il reste : lancer la stack, remplacer les IP, pousser, créer le dashboard dans l'UI Grafana (pas automatisable).

Remplace `<toi>` par ton pseudo GitHub, et `A.B.C.D` par les IP de tes VMs (`multipass list`).

---

## Étape 1 : Lancer la stack de monitoring

```bash
cd taskflow-ops/monitoring
docker compose up -d
docker compose ps
```

Attendu : `prometheus`, `grafana`, `node-exporter` en `running`.

- Prometheus : http://localhost:9090 → **Status → Targets** : job `prometheus` UP
- Grafana : http://localhost:3001 (`admin`/`admin`) → **Connections → Data sources** : *Prometheus* déjà provisionné

### Recharger après une modif de config

```bash
curl -X POST http://localhost:9090/-/reload
```

Le job `node-local` (déjà présent dans `prometheus.yml`) doit passer UP. Teste dans l'onglet *Graph* : `node_memory_MemAvailable_bytes`.

---

## Étape 2 : Instrumenter l'API (déjà fait dans le projet)

`api/src/metrics.js` et `api/tests/metrics.test.js` sont prêts. Pour vérifier en local :

```bash
cd taskflow-ops/api
npm ci
npm start &
curl -s localhost:3000/api/tasks -X POST -H 'Content-Type: application/json' -d '{"text":"Tester les métriques"}'
curl -s localhost:3000/metrics | grep -E '^(http_requests_total|taskflow_tasks_total|http_request_duration_seconds_bucket\{.*le="0.1")'
kill %1
```

Attendu :

```
http_requests_total{method="POST",route="/api/tasks",status_code="201"} 1
http_request_duration_seconds_bucket{le="0.1",method="POST",route="/api/tasks",status_code="201"} 1
taskflow_tasks_total 1
```

Puis pousser (le test `metrics.test.js` est déjà écrit) :

```bash
npm run test:ci
git add . && git commit -m "feat(api): métriques Prometheus (prom-client)" && git push
gh run watch
```

Attendu : `CI` vert (un test de plus), puis `Deploy` (staging → approbation → prod).

```bash
curl -s http://<ip staging>/metrics | grep taskflow_tasks_total
```

---

## Étape 3 : `node_exporter` sur les VMs

Le rôle, le playbook et le workflow sont déjà en place.

```bash
cd taskflow-ops
git add . && git commit -m "feat(monitoring): rôle node_exporter + workflow" && git push
gh run watch
curl -s http://<ip staging>:9100/metrics | grep '^node_cpu_seconds_total' | head -2
```

Attendu : le workflow `Monitoring (exporters)` se déclenche tout seul (le push touche les `paths`), déploie sur les deux VMs, et `:9100/metrics` répond sur chacune.

Si l'erreur `Attempting to decrypt` apparaît (car `monitoring.yml` cible aussi `prod`, chiffré) : ajoute `--vault-password-file` à la commande `ansible-playbook` du job `exporters` dans `.github/workflows/monitoring.yml`, comme dans `deploy.yml`.

---

## Étape 4 : Scraper l'API et les VMs, PromQL

### 4.1 Renseigner les IP dans `prometheus.yml`

Édite `monitoring/prometheus/prometheus.yml` : remplace les `A.B.C.D` par les IP réelles de `taskflow-web1` (staging) et `taskflow-web2` (prod), dans les jobs `taskflow-api` et `node-vms`.

```bash
cd taskflow-ops/monitoring
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
curl -X POST http://localhost:9090/-/reload
```

Attendu : `SUCCESS: 0 rule files found`, puis 6 targets UP dans *Status → Targets*.

### 4.2 Générer du trafic

```bash
for i in $(seq 1 200); do curl -s http://<ip staging>/api/tasks >/dev/null; done
for i in $(seq 1 20);  do curl -s http://<ip staging>/api/nope  >/dev/null; done   # des 404
curl -s -X POST http://<ip staging>/api/tasks -H 'Content-Type: application/json' -d '{"text":"x","priority":"urgent"}'  # un 400
```

### 4.3 Les 10 requêtes PromQL (dans Prometheus → Graph)

| # | Indicateur | PromQL |
|---|---|---|
| 1 | Requêtes/s par environnement | `sum(rate(http_requests_total[5m])) by (env)` |
| 2 | Requêtes/s par route et code | `sum(rate(http_requests_total[5m])) by (route, status_code)` |
| 3 | Taux d'erreur 5xx | `sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (env) / sum(rate(http_requests_total[5m])) by (env)` |
| 4 | Latence p95 | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le, env))` |
| 5 | Latence moyenne | `sum(rate(http_request_duration_seconds_sum[5m])) by (env) / sum(rate(http_request_duration_seconds_count[5m])) by (env)` |
| 6 | Tâches stockées | `taskflow_tasks_total` |
| 7 | CPU utilisé (%) par VM | `100 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100` |
| 8 | Mémoire utilisée (%) | `(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100` |
| 9 | Disque `/` disponible (%) | `node_filesystem_avail_bytes{mountpoint="/"} / node_filesystem_size_bytes{mountpoint="/"} * 100` |
| 10 | Targets down | `up == 0` |

Test de la requête 10 :

```bash
multipass exec taskflow-web1 -- sudo systemctl stop taskflow-api
# attendre 30 s, exécuter `up == 0` → taskflow-api staging = 0
multipass exec taskflow-web1 -- sudo systemctl start taskflow-api
```

---

## Étape 5 : Dashboard Grafana

Cette étape se fait dans l'UI Grafana, pas automatisable depuis ici.

1. **Dashboards → New → New dashboard**, ajoute 5 panels avec les requêtes ci-dessus (voir le TP pour les réglages détaillés : unit, seuils, legend).
2. Ajoute une variable `env` : *Settings → Variables → New*, type *Query*, requête `label_values(http_requests_total, env)`.
3. Nomme le dashboard **TaskFlow RED**, enregistre.
4. Exporte : *Share → Export → Export as JSON* (décoché *Export for sharing externally*) → Save to file.

```bash
mv ~/Téléchargements/TaskFlow\ RED-*.json taskflow-ops/monitoring/grafana/provisioning/dashboards/json/taskflow-red.json
```

Édite le JSON : `"uid": "taskflow-red"`, `"id": null`. Puis :

```bash
cd taskflow-ops/monitoring
docker compose restart grafana
```

Attendu : le dashboard *TaskFlow RED* apparaît dans le dossier **TaskFlow** avec un badge « provisioned ». Le supprimer dans l'UI puis redémarrer Grafana : il revient.

### Importer « Node Exporter Full »

*Dashboards → New → Import* → ID **1860** → datasource *Prometheus* → Import. Exporte-le aussi :

```bash
# après export dans json/node-exporter-full.json
cd taskflow-ops
git add monitoring && git commit -m "feat(monitoring): stack Prometheus/Grafana + dashboards provisionnés" && git push
```

---

## Bonus

```bash
# Latence sous charge
hey -z 60s -q 50 -c 10 http://<ip staging>/api/tasks
```

Nginx exporter : rôle `nginx_exporter` à créer, `stub_status` sur `127.0.0.1:8080`, non fourni ici (bonus non traité).

---

## Dépannage rapide

| Symptôme | Cause / commande |
|---|---|
| Target `taskflow-api` DOWN, `404` | nginx ne proxy pas `/metrics` : vérifier le `location ~ ^/(api/|health$|metrics$)` du vhost (TP2) |
| Target `node-vms` DOWN, `connection refused` | UFW bloque le port 9100, ou `systemctl status node_exporter` sur la VM |
| `http_requests_total` a une série par tâche (`route="/api/tasks/abc123"`) | Middleware utilisant `req.path` sans fallback route ; vérifier `req.route?.path ?? req.path`, middleware avant les routes |
| `A metric with the name ... has already been registered` | Métriques créées dans `createApp()` au lieu du niveau module |
| Dashboard provisionné n'apparaît pas | JSON invalide (`docker compose logs grafana \| grep -i dashboard`) ou `"id"` non nul |
| `rate()` → Empty query result | Moins de 2 points dans la fenêtre : attendre ≥ 30 s après le premier scrape |

---

## Checklist finale

- [ ] `docker compose ps` : prometheus, grafana, node-exporter `running`
- [ ] `api/src/metrics.js` expose les 3 métriques + défaut ; `metrics.test.js` passe en CI
- [ ] `/metrics` répond via nginx sur staging et prod
- [ ] `node_exporter` déployé sur les deux VMs via le workflow `monitoring.yml`
- [ ] `prometheus.yml` : 6 targets UP (IP remplacées)
- [ ] Les 10 requêtes PromQL exécutées
- [ ] Dashboard *TaskFlow RED* provisionné (uid `taskflow-red`, variable `env`) + *Node Exporter Full* importé
