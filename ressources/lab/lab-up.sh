#!/usr/bin/env bash
# =============================================================================
# lab-up.sh — Provisionne les 2 VMs Ubuntu du lab TaskFlow opérée
#             (taskflow-web1 = staging, taskflow-web2 = prod ; cibles Ansible).
#
# Objectif : que TOUT le monde lance la MÊME commande, quel que soit l'OS.
#   - Étudiants (Windows/macOS/Linux) : backend "multipass" (auto-détecté)
#   - Formateur sous NixOS (pas de Multipass) : backend "incus"
#
# Quel que soit le backend, le résultat est identique :
#   - 2 VMs : taskflow-web1, taskflow-web2 (Ubuntu 22.04)
#   - utilisateur "ubuntu" avec la clé publique ~/.ssh/taskflow_lab.pub injectée
#   - => l'inventaire Ansible, les variables GitHub et le workflow Deploy sont identiques.
#
# Usage :
#   ./lab-up.sh                 # auto-détecte le backend
#   LAB_BACKEND=incus ./lab-up.sh
#   LAB_BACKEND=multipass ./lab-up.sh
# =============================================================================
set -euo pipefail

# --- Configuration (surchargée par variables d'environnement) ----------------
VM1="${LAB_VM1:-taskflow-web1}"
VM2="${LAB_VM2:-taskflow-web2}"
VM_CPUS="${LAB_CPUS:-1}"
VM_MEM="${LAB_MEM:-1}"          # en Go
VM_DISK="${LAB_DISK:-5}"        # en Go
UBUNTU="${LAB_UBUNTU:-22.04}"
SSH_KEY="${LAB_SSH_KEY:-$HOME/.ssh/taskflow_lab}"
INVENTORY_OUT="${LAB_INVENTORY_OUT:-./inventory.generated.ini}"

VMS=("$VM1" "$VM2")

log()  { printf '\033[1;34m[lab]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[lab][erreur]\033[0m %s\n' "$*" >&2; }
die()  { err "$*"; exit 1; }

# --- Clé SSH dédiée au lab ----------------------------------------------------
ensure_ssh_key() {
  if [[ ! -f "$SSH_KEY" ]]; then
    log "Génération de la clé SSH du lab : $SSH_KEY"
    ssh-keygen -t ed25519 -f "$SSH_KEY" -N "" -C "taskflow-lab" >/dev/null
  fi
  PUBKEY="$(cat "${SSH_KEY}.pub")"
}

# --- Détection du backend -----------------------------------------------------
detect_backend() {
  if [[ -n "${LAB_BACKEND:-}" ]]; then
    echo "$LAB_BACKEND"; return
  fi
  if command -v multipass >/dev/null 2>&1; then echo "multipass"; return; fi
  if command -v incus     >/dev/null 2>&1; then echo "incus";     return; fi
  die "Aucun backend trouvé. Installe Multipass (étudiants) ou Incus (NixOS), ou force LAB_BACKEND=..."
}

# --- Backend : Multipass ------------------------------------------------------
mp_create() {
  local vm="$1"
  if multipass info "$vm" >/dev/null 2>&1; then
    log "VM $vm déjà existante (skip création)."
  else
    log "Création de $vm (multipass)…"
    multipass launch --name "$vm" --cpus "$VM_CPUS" --memory "${VM_MEM}G" \
      --disk "${VM_DISK}G" "$UBUNTU"
  fi
  log "Injection de la clé SSH dans $vm…"
  multipass exec "$vm" -- bash -c "
    mkdir -p /home/ubuntu/.ssh
    grep -qxF '$PUBKEY' /home/ubuntu/.ssh/authorized_keys 2>/dev/null || echo '$PUBKEY' >> /home/ubuntu/.ssh/authorized_keys
    chmod 700 /home/ubuntu/.ssh && chmod 600 /home/ubuntu/.ssh/authorized_keys
    chown -R ubuntu:ubuntu /home/ubuntu/.ssh
  "
}
mp_ip() {
  multipass list --format csv | awk -F, -v n="$1" '$1==n {print $3; exit}'
}

# --- Backend : Incus ----------------------------------------------------------
incus_preflight() {
  command -v incus >/dev/null 2>&1 || die "incus introuvable (voir ressources/setup-lab.md, section NixOS)."
  if ! incus profile list >/dev/null 2>&1; then
    die "Incus non initialisé. Lance d'abord : incus admin init --minimal"
  fi
}
incus_create() {
  local vm="$1"
  local cloudinit
  # L'image images:ubuntu/.../cloud fournit cloud-init mais PAS openssh-server :
  # on l'installe et on l'active via cloud-init (l'image officielle Canonical,
  # remote "ubuntu:", l'inclurait nativement mais ce remote n'est pas garanti).
  cloudinit="$(printf '#cloud-config\npackage_update: true\npackages:\n  - openssh-server\nssh_authorized_keys:\n  - %s\nruncmd:\n  - systemctl enable --now ssh\n' "$PUBKEY")"
  if incus info "$vm" >/dev/null 2>&1; then
    log "Instance $vm déjà existante (skip création)."
  else
    log "Création de $vm (incus, VM KVM)…"
    # NB: la variante ".../cloud" embarque cloud-init (et l'agent incus) ; sans
    # elle, le user.user-data ci-dessus serait purement ignoré (image minimale).
    incus launch "images:ubuntu/${UBUNTU}/cloud" "$vm" --vm \
      -c "limits.cpu=${VM_CPUS}" \
      -c "limits.memory=${VM_MEM}GiB" \
      -c "user.user-data=${cloudinit}" \
      -d root,size="${VM_DISK}GiB"
  fi
}
incus_ip() {
  # Récupère la 1re IPv4 non-loopback (nécessite l'agent incus, présent dans l'image cloud)
  incus list "$1" -c4 --format csv 2>/dev/null | grep -oE '([0-9]+\.){3}[0-9]+' | grep -v '^127\.' | head -1
}

# --- Attente d'IP commune -----------------------------------------------------
wait_for_ip() {
  local vm="$1" getter="$2" ip="" i
  for i in $(seq 1 60); do
    ip="$($getter "$vm" || true)"
    [[ -n "$ip" ]] && { echo "$ip"; return 0; }
    sleep 3
  done
  return 1
}

main() {
  ensure_ssh_key
  local backend; backend="$(detect_backend)"
  log "Backend : $backend | VMs : ${VMS[*]} | Ubuntu $UBUNTU"

  local create getter
  case "$backend" in
    multipass) create=mp_create;    getter=mp_ip ;;
    incus)     incus_preflight; create=incus_create; getter=incus_ip ;;
    libvirt)   die "Backend libvirt non fourni par ce wrapper. Utilise incus (recommandé NixOS) ou multipass." ;;
    *)         die "Backend inconnu : $backend" ;;
  esac

  for vm in "${VMS[@]}"; do "$create" "$vm"; done

  log "Attente des adresses IP…"
  declare -A IPS
  for vm in "${VMS[@]}"; do
    ip="$(wait_for_ip "$vm" "$getter")" || die "Pas d'IP pour $vm (l'agent met parfois ~1 min sous Incus)."
    IPS[$vm]="$ip"
    log "  $vm -> $ip"
  done

  # Inventaire prêt à coller dans ansible/inventory/hosts.ini
  {
    echo "# Généré par lab-up.sh ($backend) — à coller dans ansible/inventory/hosts.ini"
    echo "[staging]"
    echo "$VM1 ansible_host=${IPS[$VM1]}"
    echo
    echo "[prod]"
    echo "$VM2 ansible_host=${IPS[$VM2]}"
    echo
    echo "[web:children]"
    echo "staging"
    echo "prod"
    echo
    echo "[web:vars]"
    echo "ansible_user=ubuntu"
    echo "ansible_ssh_private_key_file=$SSH_KEY"
  } | tee "$INVENTORY_OUT"

  echo
  log "Variables à créer sur GitHub (Settings → Environments) :"
  echo "  environment staging    → variable TARGET_IP = ${IPS[$VM1]}"
  echo "  environment production → variable TARGET_IP = ${IPS[$VM2]}   (+ required reviewer)"
  echo "  secret SSH_PRIVATE_KEY (les deux environments) = contenu de $SSH_KEY :"
  echo "      cat $SSH_KEY | pbcopy   (macOS)  |  cat $SSH_KEY | clip.exe (WSL)  |  xclip -sel clip < $SSH_KEY (Linux)"
  log "Inventaire écrit dans : $INVENTORY_OUT"
  log "Test de connexion :"
  echo "  ssh -i $SSH_KEY ubuntu@${IPS[$VM1]}"
  log "Lab prêt ✅  (la suite — runner, Ansible, Prometheus — est identique pour tous)"
}

main "$@"