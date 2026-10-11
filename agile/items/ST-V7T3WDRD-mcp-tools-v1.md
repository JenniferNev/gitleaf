---
schema: gitleaf/item@1
id: ST-V7T3WDRD
type: story
title: "MCP tools v1: create, edit frontmatter, diff and provenance for agents"
status: backlog
priority: high
epic: EP-XWARXVAT
points: 5
labels: [agents]
created: 2026-10-11
---

## Acceptance criteria
- [ ] docs_create makes a doc from a template with canonical frontmatter (id, title, owners, status: draft) and refuses to overwrite.
- [ ] docs_update_frontmatter applies a patch through the canonical serializer so the diff touches only the changed keys; body bytes never change.
- [ ] docs_diff returns the working-tree diff of docs (or of one doc) as untrusted data; docs_provenance returns LineOwner ranges and the per-kind share.
- [ ] All write tools are refused in a repository whose gitleaf.yaml is missing or invalid, and every approve/merge/complete name is still refused.
- [ ] The docs-review skill documents the new tools and the propose-then-review flow.
