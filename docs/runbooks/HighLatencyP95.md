# HighLatencyP95 (warning)

**Symptôme** : la latence p95 de l'API dépasse 300 ms (SLO) depuis 5 min.

**Vérifications**
1. Dashboard *TaskFlow RED* → *Duration* : p50 aussi dégradé (saturation globale) ou seulement p95 (quelques requêtes lentes) ?
2. Dashboard *Infra* : CPU, load, mémoire de la VM
3. Trafic anormal ? (panel *Rate*)

**Remédiation**
- VM saturée : identifier le processus (`top`), augmenter les ressources de la VM
- Fuite mémoire de l'API (RSS en hausse continue) : `sudo systemctl restart taskflow-api` puis ouvrir un ticket

**Escalade** : si p95 > 1 s pendant 15 min.
