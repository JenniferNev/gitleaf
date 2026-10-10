---
paths:
  - "packages/schema/**"
  - "packages/format/**"
  - "agile/**"
  - "docs/**/*.md"
---

# File-format rules

- The file formats (doc frontmatter `gitleaf/doc@N`, `gitleaf.yaml`, the agile module schemas) are the project's public API. Changing one requires an ADR, a version bump and a migration in `packages/schema/migrations/`.
- Frontmatter is optional in docs. When present, its key order is fixed per schema, it uses block-style YAML, LF line endings and a trailing newline.
- parse → serialize must be **byte-identical**, so every fixture in `packages/format/test/golden/` round-trips. Add a fixture for every new field.
- Never reflow, re-indent or re-wrap Markdown bodies.
- Quote YAML strings that could be misread: `no`, `yes`, `on`, `off`, version-like values, leading zeros.
- In the agile module: one entity per file, status in frontmatter (never in the path), random IDs only.
