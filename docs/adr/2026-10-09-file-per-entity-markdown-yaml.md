# File-per-entity storage in Markdown + YAML frontmatter

- Status: accepted
- Date: 2026-10-09

## Context

Work items, votes and retro notes must be tracked by git, readable without the extension, and editable by humans and agents at the same time without merge conflicts.

## Decision

- Store **one entity per file**.
- Items, docs and retro notes are Markdown with YAML frontmatter.
- Machine-shaped records (votes, poker sessions, config) are pure YAML.
- Everything is validated with JSON Schema 2020-12, and schemas are versioned (`gitleaf/<kind>@N`).
- Status lives in frontmatter, never in the folder path. Sprint membership lives on the item.

## Consequences

- Concurrent edits rarely conflict, because people edit different files. `git blame` works per field.
- Forges render the files natively.
- We need a canonical serializer that round-trips byte for byte (see `.claude/rules/file-formats.md`).
- Rejected alternatives:
  - git-bug-style git objects: invisible to agents and to PR review
  - one large JSON or board file: conflict-prone
  - a custom DSL: no tooling support, and agents generate it badly
