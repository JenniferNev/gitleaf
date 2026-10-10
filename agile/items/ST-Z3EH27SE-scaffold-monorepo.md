---
schema: gitleaf/item@1
id: ST-Z3EH27SE
type: story
title: Scaffold monorepo, CI and identity guard
status: ready
priority: high
epic: EP-0RQVJECD
points: 3
labels: [infra]
created: 2026-10-09
---

## Acceptance criteria
- [ ] pnpm workspaces matching the layout in `AGENTS.md`. Lint fails if `packages/core` imports `vscode`, `node:*` or any adapter.
- [ ] `pnpm build`, `pnpm test` (Vitest) and `pnpm lint` work from the root.
- [ ] CI (GitHub Actions plus an Azure Pipelines YAML) runs build, test, lint, `scripts/check-identity.sh` and the theme contrast generator in `packages/themes` (fails on any contrast failure).
- [ ] `LICENSE` (MIT), `NOTICE` (Codicons CC BY 4.0; Chakra Petch and Poppins OFL), `CONTRIBUTING.md` (DCO), `SECURITY.md`.
- [ ] `AGENTS.md` "Commands" section updated with the real commands.
