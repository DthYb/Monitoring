# Runner self-hosted GitHub Actions (Docker)

Le runner est l'agent qui **exécute les jobs** sur votre poste. Il est nécessaire
pour tout ce que GitHub ne peut pas atteindre : les VMs du lab, Grafana en local.

## Démarrage

```bash
cd ressources/lab/runner
cp .env.example .env
# 1. dans .env : REPO_URL=https://github.com/<vous>/taskflow-ops
# 2. GitHub → votre repo → Settings → Actions → Runners → New self-hosted runner
#    → copier le token après `--token` dans .env (RUNNER_TOKEN=…) — valable 1 h
docker compose up -d --build
docker compose logs -f runner        # attendre "Listening for Jobs"
```

Vérification : *Settings → Actions → Runners* → `lab-runner` **Idle**, labels
`self-hosted`, `linux`, `x64`, `lab`, `ansible`. Puis lancez le workflow
*Hello runner* (onglet Actions → Run workflow).

## Réseau : joindre les VMs depuis le conteneur

```bash
docker compose exec runner ping -c 1 <ip_web1>
docker compose exec runner ssh -o StrictHostKeyChecking=no ubuntu@<ip_web1> hostname   # avec la clé dans ssh-agent → normalement KO ici, c'est le job qui l'aura
```

| Situation | Solution |
|---|---|
| macOS / Windows (Docker Desktop) + Multipass | fonctionne en général tel quel (NAT vers le réseau des VMs) |
| Linux : VMs injoignables depuis le conteneur | décommenter `network_mode: host` dans `docker-compose.yml` et supprimer `extra_hosts` |
| Aucune VM possible | fallback `../ssh-target/` (conteneur SSH, limité) |

## Ré-enregistrer / dépanner

```bash
docker compose down                  # désenregistre proprement le runner
# régénérer un token (ils expirent après 1 h) → .env → up
docker compose up -d
docker compose exec runner ansible --version
```

- `REPO_URL required for repo runners` / `Invalid configuration provided for url` : `.env` incomplet → il faut **REPO_URL et RUNNER_TOKEN**.
- `RUN_AS_ROOT env var is set to true but the user has been overridden` : l'image doit tourner en root dans le conteneur (ne pas ajouter `USER` dans le Dockerfile, ne pas passer `user:` dans le compose).
- `Ephemeral option is enabled` alors que vous n'avez rien demandé : `EPHEMERAL` est défini (même à `false`) → supprimez la variable.
- *"Not configured"* / boucle au démarrage : token expiré → nouveau token.
- Le runner apparaît **Offline** : `docker compose restart runner`.
- Jobs en attente (*Waiting for a runner*) : labels du `runs-on` ≠ labels du runner.
- **Podman** (`docker` = `podman-compose`) : les images sont déjà qualifiées `docker.io/…` ; pour les steps `docker run` / `uses: docker://`, remplacez le montage du socket par `$XDG_RUNTIME_DIR/podman/podman.sock:/var/run/docker.sock` après `systemctl --user enable --now podman.socket`.

## Alternative : installation native (sans Docker)

C'est la procédure officielle affichée par GitHub dans *New self-hosted runner* :

```bash
mkdir actions-runner && cd actions-runner
curl -o actions-runner-linux-x64.tar.gz -L https://github.com/actions/runner/releases/latest/download/actions-runner-linux-x64-<version>.tar.gz
tar xzf actions-runner-linux-x64.tar.gz
./config.sh --url https://github.com/<vous>/taskflow-ops --token <TOKEN> --labels lab,ansible
./run.sh                             # premier plan
sudo ./svc.sh install && sudo ./svc.sh start   # en service systemd
```

Il faut alors installer Ansible, rsync et Node sur la machine hôte. Le conteneur
évite cette installation et isole le runner : c'est la voie recommandée en formation.

> ⚠️ Sécurité : n'utilisez jamais un runner self-hosted sur un **repo public** :
> n'importe qui pourrait exécuter du code sur votre machine via une pull request.
