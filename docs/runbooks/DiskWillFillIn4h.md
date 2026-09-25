# DiskWillFillIn4h (warning)

**Symptôme** : au rythme actuel (`predict_linear` sur 1 h), le disque `/` sera plein dans moins de 4 h.

**Vérifications**
1. `df -h /` puis `sudo du -xsh /var/log /opt/taskflow/releases /var/lib/apt 2>/dev/null`
2. Logs qui explosent ? `sudo journalctl --disk-usage`

**Remédiation**
- Anciennes releases : vérifier `keep_releases` (le rôle en garde 5)
- Journal : `sudo journalctl --vacuum-size=200M`
- apt : `sudo apt clean`

**Escalade** : si le disque dépasse 95 % → intervention immédiate (l'API ne peut plus écrire).
