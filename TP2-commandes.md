# TP2 : Déploiement automatisé GitHub Actions + Ansible — liste de commandes

Le projet `taskflow-ops` contient déjà les fichiers de ce TP :

- `ansible/roles/taskflow/` (defaults, tasks, handlers, templates) — releases, systemd, nginx
- `ansible/inventory/hosts.ini`, `group_vars/staging.yml`, `group_vars/prod.yml`
- `ansible/playbooks/deploy.yml` et `ansible/playbooks/rollback.yml`
- `.github/workflows/ansible-ping.yml` et `.github/workflows/deploy.yml`

Il reste les manipulations qui passent par ta machine et ton compte GitHub : IP des VMs, secrets/environments, Vault, approbations.

Remplace `<toi>` par ton pseudo GitHub.

---

## Étape 1 : Lab, inventaire, environments, secrets

### 1.1 Créer les VMs

```bash
cd <repo de la formation>/ressources/lab
./lab-up.sh
```

Note les IP affichées (`taskflow-web1`, `taskflow-web2`).

### 1.2 Renseigner l'inventaire et tester

Dans `taskflow-ops/ansible/inventory/hosts.ini`, remplace `A.B.C.D` par les deux IP.

```bash
cd taskflow-ops
ansible-galaxy collection install -r ansible/requirements.yml
ansible -i ansible/inventory/hosts.ini all -m ping
```

Attendu : `pong` pour `taskflow-web1` et `taskflow-web2`.

### 1.3 Créer les environments GitHub

Dans l'UI (**Settings → Environments**) ou avec `gh` :

```bash
gh api -X PUT repos/<toi>/taskflow-ops/environments/staging
gh secret set SSH_PRIVATE_KEY --env staging < ~/.ssh/taskflow_lab
gh secret set ANSIBLE_VAULT_PASSWORD --env staging --body 'formation-vault-2026'
gh variable set TARGET_IP --env staging --body '192.168.64.11'   # IP de web1

gh api -X PUT repos/<toi>/taskflow-ops/environments/production
gh secret set SSH_PRIVATE_KEY --env production < ~/.ssh/taskflow_lab
gh secret set ANSIBLE_VAULT_PASSWORD --env production --body 'formation-vault-2026'
gh variable set TARGET_IP --env production --body '192.168.64.12'   # IP de web2
```

Pour `production`, ajoute un **Required reviewer** (toi-même) dans **Settings → Environments → production** (pas possible via `gh`).

### 1.4 Vérifier que le runner joint les VMs

Le fichier `.github/workflows/ansible-ping.yml` est déjà prêt.

```bash
git add . && git commit -m "ci: inventaire + ping depuis le runner" && git push
gh workflow run ansible-ping.yml && gh run watch
```

Attendu : `pong` pour les deux VMs depuis le conteneur runner. L'avertissement sur `Identity file ... not accessible` est normal.

Si le runner ne joint pas les VMs (Linux) : ajoute `network_mode: host` au service `runner` dans le `docker-compose.yml` du lab, puis `docker compose up -d --build`.

---

## Étape 2 : Rôle Ansible et test manuel sur staging

Le rôle `taskflow`, les templates et le playbook `deploy.yml` sont déjà écrits dans le projet. Il ne reste qu'à tester.

```bash
cd taskflow-ops
npm ci && npm run build
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/deploy.yml -l staging -e app_version=manual-1
curl -s http://192.168.64.11/health
```

Attendu : `PLAY RECAP` sans échec, puis `{"status":"ok","version":"manual-1","env":"staging",...}`.

Relance le playbook pour vérifier l'idempotence :

```bash
ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/deploy.yml -l staging -e app_version=manual-1
# attendu : changed=0
```

Ouvre `http://192.168.64.11/` dans un navigateur pour voir le front.

---

## Étape 3 : `deploy.yml` — build once, staging, smoke test

Déjà en place dans `.github/workflows/deploy.yml` (jobs `build`, `deploy-staging`, `smoke-staging`).

```bash
git add . && git commit -m "cd: workflow deploy staging (build once)" && git push
gh run watch
```

Attendu : 3 jobs verts — `🔨 Build artefact`, `🚀 Deploy staging` (avec un lien vers `http://192.168.64.11`), `🩺 Smoke test staging`.

Constater la persistance du workspace sur le runner :

```bash
docker compose exec runner ls /tmp/runner/work/taskflow-ops/taskflow-ops
```

---

## Étape 4 : Production avec approbation et Vault

### 4.1 Chiffrer `group_vars/prod.yml`

```bash
cd taskflow-ops
ansible-vault encrypt ansible/inventory/group_vars/prod.yml
# New Vault password: formation-vault-2026  (le même que le secret ANSIBLE_VAULT_PASSWORD)
head -1 ansible/inventory/group_vars/prod.yml
```

Attendu : `$ANSIBLE_VAULT;1.1;AES256`.

Optionnel, pour la démo du masquage :

```bash
ansible-vault edit ansible/inventory/group_vars/prod.yml
# ajouter : api_admin_token: s3cr3t-prod
```

### 4.2 Déployer en prod

Les jobs `deploy-prod` et `smoke-prod` sont déjà dans `deploy.yml`.

```bash
git add . && git commit -m "cd: déploiement production avec approbation" && git push
gh run watch
```

Attendu : après `smoke-staging`, le run passe en **Waiting**. Va sur GitHub → **Review deployments → production → Approve and deploy**. Puis `smoke-prod` devient vert.

```bash
curl -s http://192.168.64.12/health
```

---

## Étape 5 : Rollback

Le playbook `rollback.yml` et le job `rollback` sont déjà en place.

### Test grandeur nature

```bash
# Noter le numéro de run actuellement déployé en prod
curl -s http://192.168.64.12/health

# Pousser un commit anodin pour obtenir un run N+1 (déployé après approbation)
git commit --allow-empty -m "chore: run suivant" && git push
gh run watch
# approuver le déploiement prod dans l'UI

# Revenir au run N
gh workflow run deploy.yml -f rollback_to=<N>
gh run watch
curl -s http://192.168.64.12/health
```

Attendu : seul le job `⏪ Rollback production` s'exécute (après approbation), `/health` renvoie `"version":"<N>"`.

Sur la VM :

```bash
ssh -i ~/.ssh/taskflow_lab ubuntu@192.168.64.12 "ls -l /opt/taskflow/current"
```

---

## Bonus : notification Discord/Slack

Le job `notify` est déjà dans `deploy.yml`, il ne manque que le secret :

```bash
gh secret set DISCORD_WEBHOOK --body 'https://discord.com/api/webhooks/...'
```

---

## Dépannage rapide

| Symptôme | Cause / commande |
|---|---|
| `UNREACHABLE! Permission denied (publickey)` | `SSH_PRIVATE_KEY` incomplet, ou le job n'a pas `environment:` |
| `Unable to locate artifact 'taskflow-build'` | Job `build` skipped (rollback) ou échoué, ou nom d'artefact différent |
| `Attempting to decrypt but no vault secrets found` | `--vault-password-file` absent, ou mot de passe différent de `ANSIBLE_VAULT_PASSWORD` |
| `deploy-prod` ne demande pas d'approbation | Required reviewers non configurés sur `production`, ou `environment:` absent du job |
| `taskflow-api.service: Failed with result 'exit-code'` | `journalctl -u taskflow-api` sur la VM : souvent `node_modules` manquant ou `.env` absent |
| `404` sur `/api/tasks` mais `/` fonctionne | Site `default` encore actif, ou `location ~ ^/(api/|health$|metrics$)` absent — `nginx -t` puis `systemctl reload nginx` |

---

## Checklist finale

- [ ] `hosts.ini` avec les bonnes IP dans `[staging]` et `[prod]`
- [ ] Environments `staging` / `production` créés, `production` avec required reviewer, secrets et variable `TARGET_IP` par environment
- [ ] Rôle `taskflow` : releases, `current`, service systemd actif, nginx proxy `/api`, `/health`, `/metrics`
- [ ] `ansible-playbook … deploy.yml` relancé = `changed=0`
- [ ] `deploy.yml` : build unique, deploy staging + smoke, deploy prod (approbation) + smoke
- [ ] `group_vars/prod.yml` commence par `$ANSIBLE_VAULT`
- [ ] Aucun secret en clair dans le repo ni dans les logs
- [ ] Rollback démontré : `/health` prod affiche la version restaurée
