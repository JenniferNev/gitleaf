---
schema: gitleaf/item@1
id: ST-96WHP0KK
type: story
title: Canonical Markdown/frontmatter serializer with golden tests
status: in-review
priority: high
epic: EP-0RQVJECD
points: 8
depends_on: [ST-KT3NG4K8]
labels: [format]
created: 2026-10-09
---

## Acceptance criteria
- [ ] parse → serialize is byte-identical for all fixtures in `packages/format/test/golden/`: no frontmatter, CRLF (documented normalization), unicode, comments in YAML, empty body.
- [ ] Updating one frontmatter field changes exactly one line in the diff (property-based test).
- [ ] Body bytes are never modified.
