---
schema: gitleaf/item@1
id: ST-KT3NG4K8
type: story
title: Doc frontmatter and gitleaf.yaml schemas v1
status: backlog
priority: high
epic: EP-0RQVJECD
points: 5
depends_on: [ST-Z3EH27SE]
labels: [format]
created: 2026-10-09
---

## Acceptance criteria
- [ ] JSON Schema 2020-12 for `gitleaf/doc@1`: optional `id`, `title`, `owners`, `status` (draft, in-review, published, archived), `tags`, `review_by`. Unknown keys allowed only under `x-`.
- [ ] Schema for `gitleaf.yaml`: doc roots across repos, rules (owners required? stale after N days), forge settings without secrets, and `secret://` refs only.
- [ ] Generated TS types exported from `packages/schema`.
- [ ] Every doc in this repo validates.
