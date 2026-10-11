---
schema: gitleaf/item@1
id: EP-0RQVJECD
type: epic
title: "Foundations: docs in git, validated, attributable, agent-ready"
status: done
priority: high
created: 2026-10-09
---

## Goal
A repo can validate its docs, attribute changes to people or agents, and expose them to Copilot and Claude through one MCP server, all before the full VS Code UI exists.

## Exit criteria
- `gitleaf validate` runs in CI (GitHub Actions and Azure Pipelines) on this repo's own `docs/**`.
- A provenance report for one doc separates human and agent lines, at commit level at minimum.
- Copilot and Claude Code can both search, read and validate docs through the same MCP server.
- The identity guard and secret scanning block bad commits locally and in CI.
