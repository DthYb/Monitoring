# TP1 : Opérer et factoriser le CI de TaskFlow — liste de commandes

Le dossier `taskflow-ops/` contient déjà les fichiers des étapes 1.5, 2, 3 et 4.1
(`hello-runner.yml`, `setup-node-project/action.yml`, `reusable-node-ci.yml`, `ci.yml`).
Il reste à les pousser sur GitHub et à faire les manipulations qui passent par ton compte et ta machine.

Remplace `<toi>` par ton pseudo GitHub.

---

## Étape 1 : Repo + runner self-hosted

### 1.1 Créer le repo et pousser

```bash
cd taskflow-ops
git init -b main
git add .
git commit -m "chore: starter TaskFlow opérée"

# Avec gh
gh repo create taskflow-ops --private --source=. --remote=origin --push

# Ou à la main
# git remote add origin git@github.com:<toi>/taskflow-ops.git
# git push -u origin main
```

Vérifier : onglet **Actions** du repo, le run `CI` doit être vert.

### 1.2 Vérifier en local (facultatif)

```bash
npm ci && npm run test:ci && npm run build
cd api && npm ci && npm run test:ci && cd ..
```

Deux fichiers `reports/junit.xml` sont générés (racine et `api/`).

### 1.3 Token du runner (dans l'UI GitHub)

**Settings → Actions → Runners → New self-hosted runner → Linux / x64**, puis copier le token (`A…`, valable 1 heure, usage unique).

### 1.4 Lancer le runner en conteneur

```bash
# Depuis le repo de la formation
git clone https://github.com/Foreach-Academy-France/formation-automatisation-ci-monitoring.git
cd formation-automatisation-ci-monitoring/ressources/lab/runner
cp .env.example .env
```

Éditer `.env` :

```bash
REPO_URL=https://github.com/<toi>/taskflow-ops
RUNNER_TOKEN=AXXXXXXXXXXXXXXXXXXXXXXXXXXXX
RUNNER_NAME=lab-runner
LABELS=self-hosted,lab,ansible
```

Puis :

```bash
docker compose up -d --build
docker compose logs -f runner
```

Attendu : `Runner successfully added` puis `Listening for Jobs`. Dans **Settings → Actions → Runners**, `lab-runner` est **Idle**.

Token expiré ou déjà utilisé :

```bash
# Regénérer un token dans l'UI, mettre à jour .env, puis :
docker compose down -v && docker compose up -d
```

### 1.5 Premier job sur le runner

Le fichier `.github/workflows/hello-runner.yml` est déjà dans le projet.

```bash
git add .github/workflows/hello-runner.yml
git commit -m "ci: premier workflow sur le runner self-hosted"
git push
gh workflow run hello-runner.yml
gh run watch
```

Attendu : le job `hello` tourne sur `lab-runner`, et `smoke-action` est vert (`Cache not found` au 1er run, `Cache restored` au 2e).

---

## Étapes 2 et 3 : Action composite, workflow réutilisable, ci.yml

Fichiers déjà présents :

- `.github/actions/setup-node-project/action.yml`
- `.github/workflows/reusable-node-ci.yml`
- `.github/workflows/ci.yml`

```bash
git add .github
git commit -m "ci: workflow réutilisable + action composite (front + api)"
git push
gh run watch
```

Attendu : 6 jobs (`Front / 🔍 Lint`, `Front / 🧪 Tests`, `Front / 🔨 Build`, puis `API / …`), deux résumés de couverture, les artefacts `dist-front` et `coverage-*`, et les checks « Tests front » / « Tests api » sur le commit.

---

## Étape 4 : Optimiser, casser, protéger

### 4.1 Ignorer les changements de doc

Déjà configuré dans `ci.yml` (`paths-ignore`). Test :

```bash
echo "" >> README.md
git commit -am "docs: test paths-ignore" && git push
# Aucun run CI ne doit démarrer
```

### 4.2 Casser un test volontairement

Dans `tests/tasks.test.js`, rendre une assertion fausse (ex. ligne 52, `expect(task.priority).toBe('high')` remplacé par une valeur incorrecte selon le test).

```bash
git commit -am "test: casse volontaire pour lire le rapport" && git push && gh run watch
```

Attendu : `Front / 🧪 Tests` rouge, `Front / 🔨 Build` skipped, rapport quand même publié, API verte.

Réparer :

```bash
git commit -am "test: répare l'assertion" && git push
```

### 4.3 Vérifier `concurrency`

```bash
git commit --allow-empty -m "ci: test concurrency 1" && git push
git commit --allow-empty -m "ci: test concurrency 2" && git push
```

Attendu : le premier run passe en **Cancelled** dès que le second démarre.

### 4.4 Protéger `main`

Dans l'UI : **Settings → Rules → Rulesets → New branch ruleset**

- Target : `main`
- Require a pull request before merging (0 approbation)
- Require status checks to pass : `Front / 🔨 Build` et `API / 🔨 Build`

Test avec une PR :

```bash
git switch -c feat/protection-test
echo "// test" >> src/app.js
git commit -am "feat: test de la protection" && git push -u origin feat/protection-test
gh pr create --fill
```

Attendu : « Merging is blocked » tant que les checks ne sont pas verts, puis le bouton Merge s'active. Fusionner et supprimer la branche :

```bash
gh pr merge --squash --delete-branch
git switch main && git pull
```

---

## Dépannage rapide

| Symptôme | Cause / commande |
|---|---|
| Runner `Offline` | `docker compose logs runner` ; si `NotFound`, regénérer un token puis `docker compose down -v && docker compose up -d` |
| `Can't find 'action.yml'` | Il manque `actions/checkout@v4` avant l'action locale |
| `Required property is missing: shell` | Ajouter `shell: bash` sur les steps `run:` d'une action composite |
| `Resource not accessible by integration` | `permissions: checks: write` absent dans le workflow **appelant** (`ci.yml`) |
| `No test report files were found` | Vérifier le `path:` (`<working-directory>/reports/junit.xml`) et le script `test:ci` |
| `Job 'build' depends on unknown job` | `needs:` utilise les identifiants des jobs, pas leur `name:` |

---

## Checklist finale

- [ ] `lab-runner` **Idle** et `hello-runner.yml` exécuté dessus
- [ ] Action composite utilisée par tous les jobs du workflow réutilisable
- [ ] `ci.yml` appelle le workflow réutilisable deux fois, avec `permissions` et `concurrency`
- [ ] Rapports JUnit et résumés de couverture visibles, artefact `dist-front` téléchargeable
- [ ] `main` protégée par `Front / 🔨 Build` et `API / 🔨 Build`
- [ ] Run `CI` vert sur `main`
