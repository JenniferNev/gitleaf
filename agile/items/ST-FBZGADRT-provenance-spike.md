---
schema: gitleaf/item@1
id: ST-FBZGADRT
type: spike
title: "Provenance spike: blame + trailers + Agent Trace notes"
status: in-review
priority: high
epic: EP-0RQVJECD
points: 5
depends_on: [ST-Z3EH27SE]
labels: [provenance]
created: 2026-10-09
---

## Questions to answer
- What does `vscode.git` `blame()` return (raw or porcelain), and is it enough for line → commit mapping?
- Which trailers do Claude Code (`attribution`) and VS Code (`git.addAICoAuthor`) write today? Record real samples.
- Can we read Agent Trace records from git notes (`refs/notes/ai`, as Git AI writes them) and map them to current lines after later edits?

## Output
An ADR update with the `LineOwner` model, sample data, and a CLI prototype: `gitleaf provenance docs/x.md`.
