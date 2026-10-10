# Plain Markdown docs; one file per entity; random IDs

- Status: accepted
- Date: 2026-10-09

## Decision

- **Docs are plain Markdown.** Frontmatter is optional (`id`, `title`, `owners`, `status`, `tags`), validated by JSON Schema 2020-12 and versioned (`gitleaf/doc@1`). A stable `id` keeps links working across file moves.
- **Agile module entities** (items, votes, retro notes) are one file each, with status in frontmatter and never in the path.
- **IDs** are `<TYPE>-<8 random Crockford base32 chars>`. Sequential keys would need a central allocator.
- **The canonical serializer** round-trips byte for byte and touches only the frontmatter keys that changed.

## Consequences

- Line-level diffs and blame stay meaningful.
- Hand edits and tool edits coexist safely.
