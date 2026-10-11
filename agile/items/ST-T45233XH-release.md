---
schema: gitleaf/item@1
id: ST-T45233XH
type: story
title: "Release: VSIX in CI, walkthrough, install and usage docs"
status: backlog
priority: medium
epic: EP-XWARXVAT
points: 3
depends_on: [ST-E4PMXQ19, ST-94PNPRG9]
labels: [infra, docs]
created: 2026-10-11
---

## Acceptance criteria
- [ ] CI builds gitleaf.vsix and gitleaf-themes.vsix on every PR and attaches them as workflow artifacts; a tag v* creates a GitHub release with both.
- [ ] A walkthrough (Get Started with Gitleaf) covers Initialize Workspace, Import, the Docs view, committing and opening a PR, and provenance.
- [ ] README (root and extension) documents installation from the VSIX, the Claude Code plugin, and day-to-day use.
