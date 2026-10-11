---
schema: gitleaf/item@1
id: EP-XWARXVAT
type: epic
title: "MVP: retire one Confluence space with Gitleaf for VS Code"
status: in-progress
priority: high
created: 2026-10-11
---

## Goal
A team retires one Confluence space. Its pages live in git, every change goes through review in VS Code, and for any line you can answer who (or which agent) wrote it and who approved it.

## Exit criteria
- Import a Confluence HTML export (and a Notion Markdown export) into a docs root as clean Markdown with frontmatter.
- Browse docs across roots and repos in a Gitleaf explorer; validation problems appear in the Problems panel on save.
- Commit doc changes from a Gitleaf changes view with a drafted message and trailers, then open a pull request on GitHub from VS Code.
- Hover any line of a doc to see who wrote it (person or agent) and, for merged lines, which pull request and who approved it; a provenance view shows the human/agent share.
- Copilot and Claude can create docs, edit frontmatter, read diffs and provenance through the MCP server; they still cannot approve or merge.
- A VSIX is built in CI; README documents installation and use.

## Out of scope for the MVP (stays in the backlog)
- Azure DevOps review panel.
- Static docs site, docs-health dashboard, agile module.
