# =============================================================================
# Image du runner self-hosted GitHub Actions du lab TaskFlow
# =============================================================================
# Base : myoung34/github-runner:ubuntu-noble (Ubuntu 24.04 + agent actions/runner, enregistrement
# automatique via les variables REPO_URL / RUNNER_TOKEN au démarrage).
# On y ajoute les outils dont les jobs `runs-on: [self-hosted, lab]` ont besoin :
#   - Ansible (+ collections) et rsync/ssh : déploiement sur les VMs
#   - Node 20 : pour exécuter npm sur le runner si nécessaire
#   - curl : smoke tests, annotations Grafana
#
#   docker compose build   (≈ 3 min la première fois)
# =============================================================================
FROM docker.io/myoung34/github-runner:ubuntu-noble

USER root
ENV DEBIAN_FRONTEND=noninteractive

# Outils système
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 python3-venv python3-pip \
      openssh-client rsync curl ca-certificates gnupg git jq \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 (dépôt NodeSource)
RUN mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
       | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
       > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Ansible dans un venv dédié (isolé du Python système)
RUN python3 -m venv /opt/ansible \
    && /opt/ansible/bin/pip install --no-cache-dir --upgrade pip \
    && /opt/ansible/bin/pip install --no-cache-dir "ansible>=9,<12" \
    && ln -s /opt/ansible/bin/ansible* /usr/local/bin/
ENV PATH="/opt/ansible/bin:${PATH}"

# Collections utilisées par les rôles (synchronize, ufw)
RUN ansible-galaxy collection install community.general ansible.posix \
      -p /usr/share/ansible/collections
ENV ANSIBLE_COLLECTIONS_PATH=/usr/share/ansible/collections:/root/.ansible/collections

# L'agent tourne en root dans le conteneur (comportement par défaut de l'image,
# RUN_AS_ROOT=true) : c'est ce qui permet aux jobs d'utiliser le socket Docker
# monté (`docker run`, `uses: docker://…`) sans gymnastique de groupes.
# Sous Podman rootless, "root" dans le conteneur = votre utilisateur sur l'hôte.
RUN mkdir -p /root/.ssh /tmp/runner/work
