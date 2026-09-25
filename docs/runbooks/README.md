# Runbooks TaskFlow

Un **runbook** = la procédure à suivre quand une alerte se déclenche. Chaque alerte
Prometheus (`monitoring/prometheus/rules/taskflow.yml`) pointe vers son runbook via
l'annotation `runbook_url` : le lien arrive directement dans la notification.

Modèle commun : **Symptôme** → **Vérifications** → **Remédiation** → **Escalade**.

| Alerte | Sévérité | Runbook |
|---|---|---|
| InstanceDown | critical | [InstanceDown.md](InstanceDown.md) |
| TaskFlowApiDown | critical | [TaskFlowApiDown.md](TaskFlowApiDown.md) |
| HighErrorRate | warning | [HighErrorRate.md](HighErrorRate.md) |
| HighLatencyP95 | warning | [HighLatencyP95.md](HighLatencyP95.md) |
| HostHighCpu | warning | [HostHighCpu.md](HostHighCpu.md) |
| HostOutOfMemory | warning | [HostOutOfMemory.md](HostOutOfMemory.md) |
| DiskWillFillIn4h | warning | [DiskWillFillIn4h.md](DiskWillFillIn4h.md) |
| ContainerRestarting | warning | [ContainerRestarting.md](ContainerRestarting.md) |

> Les runbooks sont du code : versionnés, relus en PR, mis à jour après chaque post-mortem.
