---
schema: gitleaf/item@1
id: ST-1BEP9591
type: story
title: "Secret-scanning guardrails (pre-commit + CI)"
status: ready
priority: high
epic: EP-0RQVJECD
points: 3
labels: [security]
created: 2026-10-09
---

## Acceptance criteria
- [ ] `.pre-commit-config.yaml` runs `gitleaks git --pre-commit --staged --redact` and fails on findings.
- [ ] CI runs a full-history gitleaks scan with a pinned version and checksum (GitHub Actions + Azure Pipelines).
- [ ] A planted fake key is blocked locally and in CI (documented in `SECURITY.md`).
