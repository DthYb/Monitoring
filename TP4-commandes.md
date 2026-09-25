# TP4 : Alerting et monitoring complet — liste de commandes

Le projet `taskflow-ops` contient déjà les fichiers de ce TP :

- `monitoring/docker-compose.yml` : `alertmanager`, `cadvisor`, `blackbox-exporter`, `mailhog` décommentés
- `monitoring/blackbox/blackbox.yml` (déjà fourni par le starter)
- `monitoring/prometheus/prometheus.yml` : bloc `alerting`, jobs `cadvisor` et `blackbox` ajoutés (**IP à remplacer**, voir étape 1.2)
- `monitoring/prometheus/rules/taskflow.yml` : 2 recording rules + 7 alertes, validées par `promtool` (9 règles trouvées)
- `monitoring/alertmanager/alertmanager.example.yml` : à copier en `alertmanager.yml` (gitignoré) et à compléter avec ton vrai webhook
- `.github/workflows/ci.yml` : job `lint-monitoring` (promtool + amtool)
- `.github/workflows/deploy.yml` : jobs `annotate-grafana-staging` et `annotate-grafana-prod`

J'ai validé `promtool check rules`, `promtool check config --syntax-only` et `amtool check-config` en local (binaires téléchargés temporairement, pas de Docker ici) : tout passe. Il reste les étapes qui nécessitent la stack réellement lancée, l'UI Grafana, et ton webhook Discord.

Remplace `<toi>` par ton pseudo GitHub, `A.B.C.D`/`STAGING_IP`/`PROD_IP` par les IP réelles de tes VMs.

---

## Étape 1 : Infra et disponibilité externe

### 1.1 Lancer la stack complète

```bash
cd taskflow-ops/monitoring
docker compose up -d
docker compose ps
```

Attendu : 6 conteneurs `running` (prometheus, grafana, node-exporter, alertmanager, cadvisor, blackbox-exporter, mailhog — 7 en fait).

### 1.2 Renseigner les IP dans `prometheus.yml`

Édite `monitoring/prometheus/prometheus.yml` : remplace **`STAGING_IP`** et **`PROD_IP`** par les IP réelles (jobs `taskflow-api`, `node-vms`, `blackbox`). Dans le job `blackbox`, les regex `'http://STAGING_IP.*'` / `'http://PROD_IP.*'` doivent contenir l'IP réelle (échappe les points si tu veux être strict : `192\.168\.64\.11`, sinon `.` matche n'importe quel caractère — ça marche mais c'est moins précis).

```bash
docker compose exec prometheus promtool check config /etc/prometheus/prometheus.yml
curl -X POST http://localhost:9090/-/reload
```

Attendu : 10 targets UP (Status → Targets). Requêtes à tester :

```
probe_success
probe_duration_seconds
sum(rate(container_cpu_usage_seconds_total{name=~".+"}[5m])) by (name)
predict_linear(node_filesystem_avail_bytes{mountpoint="/"}[1h], 4*3600)
```

### 1.3 Panels infra dans Grafana

Dans l'UI, ajoute une ligne « Infra » au dashboard *TaskFlow RED* : `probe_success` (Stat, mapping 1→UP vert / 0→DOWN rouge), CPU VM, disque prévu à 4h. Ré-exporte le JSON (voir étape 5 du TP3 pour la procédure d'export).

---

## Étape 2 : Règles d'alerte (déjà écrites, à recharger)

```bash
cd taskflow-ops/monitoring
docker compose exec prometheus promtool check rules /etc/prometheus/rules/taskflow.yml
curl -X POST http://localhost:9090/-/reload
```

Attendu : `SUCCESS: 9 rules found`. Dans Prometheus → **Alerts** : `Watchdog` est *Firing*, les autres *Inactive*.

### Pousser et vérifier le CI

```bash
cd taskflow-ops
git add . && git commit -m "feat(monitoring): alerting complet" && git push
gh run watch
```

Attendu : job `📈 Lint monitoring` vert dans `CI` (j'ai déjà fait passer `promtool`/`amtool` en local, donc ça devrait être bon direct).

Pour tester volontairement l'échec : casse une règle (ex. `expr: up = 0` dans `rules/taskflow.yml`), pousse, observe le job rouge avec `parse error: unexpected "="`, corrige, repousse.

---

## Étape 3 : Alertmanager, notifications, silence

### 3.1 Créer le vrai `alertmanager.yml` (jamais committé)

```bash
cd taskflow-ops/monitoring
cp alertmanager/alertmanager.example.yml alertmanager/alertmanager.yml
```

Édite `alertmanager/alertmanager.yml` : remplace `https://discord.com/api/webhooks/CHANGE_ME` par ton vrai webhook Discord (ou configure `slack_configs` à la place, en commentant `discord_configs`).

```bash
docker compose exec alertmanager amtool check-config /etc/alertmanager/alertmanager.yml
docker compose restart alertmanager
```

Attendu : `SUCCESS`, 3 receivers, 1 inhibit rule (le TP annonce « 2 inhibit rules » dans son texte, mais la config fournie n'en déclare qu'une — ce n'est pas une erreur de ta part). http://localhost:9093 doit afficher `Watchdog` dans *Alerts*.

### 3.2 Déclencher une vraie alerte

```bash
multipass exec taskflow-web1 -- sudo systemctl stop taskflow-api
```

Suis la chaîne (~2 min) :
1. Prometheus → *Alerts* : `TaskFlowApiDown{env="staging"}` Pending → Firing
2. Alertmanager (:9093) : l'alerte apparaît groupée
3. MailHog (http://localhost:8025) : mail `[FIRING:1] TaskFlowApiDown staging` — pas de mail `InstanceDown` (inhibée)
4. Discord : message du webhook

```bash
multipass exec taskflow-web1 -- sudo systemctl start taskflow-api
```

Attendu : message `[RESOLVED]` ~1 min plus tard.

### 3.3 Poser un silence

```bash
docker compose exec alertmanager amtool silence add \
  alertname=TaskFlowApiDown env=staging \
  --alertmanager.url=http://localhost:9093 -d 1h -c "maintenance planifiée staging" -a "$USER"

docker compose exec alertmanager amtool silence query --alertmanager.url=http://localhost:9093

multipass exec taskflow-web1 -- sudo systemctl stop taskflow-api
```

Attendu : alerte *firing* mais *silenced*, aucune notification. Puis :

```bash
multipass exec taskflow-web1 -- sudo systemctl start taskflow-api
docker compose exec alertmanager amtool silence expire <id> --alertmanager.url=http://localhost:9093
```

---

## Étape 4 : Annotation Grafana à chaque déploiement

### 4.1 Créer le token et les secrets

Dans l'UI Grafana : **Administration → Users and access → Service accounts → Add**, nom `github-actions`, rôle **Editor** → *Add service account token* → copie `glsa_…`.

```bash
gh secret set GRAFANA_TOKEN --body 'glsa_xxxxxxxx'
gh variable set GRAFANA_URL --body 'http://host.docker.internal:3001'
```

Sous Linux, si le runner ne résout pas `host.docker.internal`, ajoute `extra_hosts: ["host.docker.internal:host-gateway"]` au service `runner` du compose du lab (`docker compose down && docker compose up -d --build`).

Les jobs `annotate-grafana-staging` et `annotate-grafana-prod` sont déjà dans `deploy.yml`.

### 4.2 Afficher les annotations dans le dashboard

*TaskFlow RED → Settings → Annotations → New* : datasource **Grafana**, *Filter by*: Tags → `deploy`. Enregistre, ré-exporte le JSON.

### 4.3 Pousser et observer

```bash
cd taskflow-ops
git add . && git commit -m "feat(monitoring): alerting complet + annotations de déploiement" && git push
gh run watch
# approuver le déploiement prod dans l'UI
```

Attendu : une ligne verticale « Deploy #N » sur tous les panels du dashboard, au moment du déploiement.

---

## Bonus : Loki + Promtail (facultatif, non préparé dans ce dépôt)

Non fait ici, car il nécessite d'ajouter les services au compose et un fichier `loki/promtail-config.yml`. Voir le TP pour le YAML complet si tu veux le tenter.

---

## Dépannage rapide

| Symptôme | Cause / commande |
|---|---|
| `probe_success` = 0 alors que `/health` répond dans le navigateur | Le conteneur blackbox ne joint pas l'IP de la VM : `docker compose exec blackbox-exporter wget -qO- http://<ip>/health` |
| Alerte *Firing* dans Prometheus mais jamais dans Alertmanager | Bloc `alerting:` absent, ou reload non fait. Vérifier *Status → Runtime & Build* |
| Mail dans MailHog mais rien sur Discord | Webhook faux (`docker compose logs alertmanager \| grep -i discord`), ou alerte pas `critical` |
| `amtool check-config` : `unsupported scheme ""` | `webhook_url` vide ou mal indenté |
| `curl: (22) ... 401` sur `/api/annotations` | Token expiré/invalide, ou rôle *Viewer* au lieu d'*Editor* |
| `Could not resolve host: host.docker.internal` | Ajouter `extra_hosts` au service `runner`, ou `network_mode: host` + `GRAFANA_URL=http://localhost:3001` |

---

## Checklist finale

- [ ] cAdvisor, blackbox_exporter, Alertmanager, MailHog dans le compose ; 10 targets UP ; `probe_success` = 1
- [ ] `rules/taskflow.yml` : 2 recording rules + 7 alertes, `promtool check rules` OK
- [ ] Job `lint-monitoring` vert dans `CI`
- [ ] `alertmanager.yml` réel (gitignoré) avec le vrai webhook ; `amtool check-config` OK
- [ ] Alerte `TaskFlowApiDown` reçue (MailHog et/ou Discord) puis `RESOLVED` ; silence posé et vérifié
- [ ] Annotations `deploy` visibles sur le dashboard
- [ ] Aucun secret en clair dans le repo (`alertmanager.yml` bien gitignoré, seul `alertmanager.example.yml` committé)
