ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/monitoring.yml \
  --vault-password-file "$RUNNER_TEMP/.vault_pass"
