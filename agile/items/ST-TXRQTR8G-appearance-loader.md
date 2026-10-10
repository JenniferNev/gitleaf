---
schema: gitleaf/item@1
id: ST-TXRQTR8G
type: story
title: Appearance pack loader, neutral tokens and Select Appearance command
status: backlog
priority: medium
epic: EP-0RQVJECD
points: 5
depends_on: [ST-Z3EH27SE]
labels: [design, ui]
links:
  docs: ["docs/design/appearance-packs.md", "docs/design/brief.md"]
created: 2026-10-09
---

## Acceptance criteria
- [ ] Neutral `tokens.css` (Tier 1 + 2) and `contributes.colors` with single-dot ids.
- [ ] Packs are discovered through `vscode.extensions.all` and `onDidChange`. Validation follows the spec's allowlist, and a rejected pack is reported in the output channel.
- [ ] The `gitleaf.appearance` setting supports pack `configurationDefaults` and falls back silently when the pack is missing.
- [ ] **Gitleaf: Select Appearance** shows a live preview in a "Token preview" webview with a strict CSP.
- [ ] A test pack fixture (neutral, MIT) covers the loader. **No personal identity in fixtures.**
