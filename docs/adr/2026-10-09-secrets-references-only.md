# Secrets: references in the repo, values in an external versioned store

- Status: accepted
- Date: 2026-10-09

## Decision

- Docs and config may contain `secret://` references only.
- Supported backends, behind `SecretsPort`:
  - **Infisical:** the default for teams
  - **OpenBao KV v2:** for self-hosting
  - **SOPS + age in a separate private repo:** needs no infrastructure
- Agent tools see metadata only, never values.
- Enforcement has three layers:
  1. gitleaks pre-commit hook (fails on findings)
  2. gitleaks full-history scan in CI
  3. `gitleaf validate` rejects a value wherever a reference is expected

## Consequences

The extension is a viewer of secret metadata, not a secrets manager.
