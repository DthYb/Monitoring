# HostHighCpu (warning)

**Symptôme** : CPU > 80 % en moyenne depuis 10 min sur une VM.

**Vérifications**
1. `top` / `htop` sur la VM : quel processus ?
2. Dashboard *Infra* → *CPU par mode* : `user` (application) ou `iowait` (disque) ?

**Remédiation**
- Processus fou : `sudo systemctl restart <service>`
- Charge légitime : dimensionner la VM (`multipass stop` → `multipass set local.<vm>.cpus=2`)

**Escalade** : si la latence de l'API est impactée (HighLatencyP95 en parallèle).
