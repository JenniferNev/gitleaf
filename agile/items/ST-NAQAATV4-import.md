---
schema: gitleaf/item@1
id: ST-NAQAATV4
type: story
title: "Import Confluence HTML and Notion Markdown exports"
status: backlog
priority: high
epic: EP-XWARXVAT
points: 8
labels: [import, cli]
created: 2026-10-11
---

## Acceptance criteria
- [ ] gitleaf import confluence <export-dir|zip> --into <root> converts each page to Markdown (Turndown, GFM tables and code blocks), writes frontmatter (title, x-confluence-id, x-import-source), rewrites links between imported pages to relative paths, copies attachments next to the pages and reports what it could not convert.
- [ ] gitleaf import notion <export-dir|zip> --into <root> renames Notion's hashed filenames, rewrites links, keeps the page tree as folders and adds frontmatter.
- [ ] Both are idempotent: re-running updates pages in place (same ids) and never duplicates.
- [ ] **Gitleaf: Import…** in VS Code asks for the source kind, the export and the target root, runs the importer, then validates and opens the summary.
- [ ] Fixtures: a small Confluence HTML export and a Notion export under packages/import/test/fixtures (synthetic, no third-party content).
