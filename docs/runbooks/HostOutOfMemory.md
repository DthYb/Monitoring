# HostOutOfMemory (warning)

**Symptôme** : moins de 10 % de mémoire disponible depuis 5 min. Risque d'OOM-kill de l'API.

**Vérifications**
1. `free -m` et `ps aux --sort=-%mem | head`
2. `dmesg | grep -i oom` : un processus a-t-il déjà été tué ?

**Remédiation**
- API gourmande : `sudo systemctl restart taskflow-api`
- Augmenter la mémoire de la VM

**Escalade** : si l'OOM-killer a déjà frappé → post-mortem.
