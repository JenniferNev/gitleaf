---
schema: gitleaf/item@1
id: ST-PV13MRCY
type: story
title: "CLI: gitleaf validate (frontmatter, links, owners, secrets refs)"
status: in-review
priority: high
epic: EP-0RQVJECD
points: 5
depends_on: [ST-96WHP0KK]
labels: [cli]
created: 2026-10-09
---

## Acceptance criteria
- [ ] Validates frontmatter against the schema, finds broken relative links and wikilinks, missing owners (when required), stale docs, and secret values where refs are expected.
- [ ] Output is `file:line: message`, with `--json` for CI annotations, `NO_COLOR` support and a non-zero exit on errors.
- [ ] Works across multiple doc roots and repos declared in `gitleaf.yaml`.
- [ ] Runs in this repo's CI.
