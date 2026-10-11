---
schema: gitleaf/item@1
id: ST-E4PMXQ19
type: story
title: "Workspace init, docs explorer and problems on save"
status: done
priority: high
epic: EP-XWARXVAT
points: 8
labels: [vscode, ui]
created: 2026-10-11
---

## Acceptance criteria
- [ ] **Gitleaf: Initialize Workspace** writes gitleaf.yaml, an AGENTS.md stub pointing agents at the Gitleaf tools, and .claude/settings.json enabling the Gitleaf plugin, without overwriting existing files.
- [ ] A **Gitleaf** view container with a **Docs** tree: roots (across repos) → folders → docs, with description text for status and owners and a tooltip with the last change. Opening a doc opens the editor; a context action opens the Markdown preview.
- [ ] On save of a doc under a root (and on activation), validation runs and its diagnostics show in the Problems panel with the right range and rule id. Fixing the file clears them.
- [ ] Restricted Mode: the tree still works; init and any write command are disabled.
