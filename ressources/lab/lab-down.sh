#!/usr/bin/env bash
# =============================================================================
# lab-down.sh — Supprime les VMs du lab TaskFlow (multipass ou incus).
# Usage : ./lab-down.sh   (auto-détecte)  |  LAB_BACKEND=incus ./lab-down.sh
# =============================================================================
set -euo pipefail

VM1="${LAB_VM1:-taskflow-web1}"
VM2="${LAB_VM2:-taskflow-web2}"
VMS=("$VM1" "$VM2")

log() { printf '\033[1;34m[lab]\033[0m %s\n' "$*"; }

backend="${LAB_BACKEND:-}"
if [[ -z "$backend" ]]; then
  if   command -v multipass >/dev/null 2>&1; then backend=multipass
  elif command -v incus     >/dev/null 2>&1; then backend=incus
  else echo "Aucun backend détecté." >&2; exit 1
  fi
fi

log "Backend : $backend — suppression de ${VMS[*]}"
for vm in "${VMS[@]}"; do
  case "$backend" in
    multipass)
      if multipass info "$vm" >/dev/null 2>&1; then
        multipass delete "$vm"; log "  $vm supprimée (multipass)"
      fi
      ;;
    incus)
      if incus info "$vm" >/dev/null 2>&1; then
        incus delete "$vm" --force; log "  $vm supprimée (incus)"
      fi
      ;;
    *) echo "Backend inconnu : $backend" >&2; exit 1 ;;
  esac
done

if [[ "$backend" == "multipass" ]]; then
  multipass purge || true
fi
log "Lab nettoyé ✅"