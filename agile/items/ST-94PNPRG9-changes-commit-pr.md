---
schema: gitleaf/item@1
id: ST-94PNPRG9
type: story
title: "Changes view, commit composer and GitHub pull request handoff"
status: backlog
priority: high
epic: EP-XWARXVAT
points: 8
depends_on: [ST-E4PMXQ19]
labels: [vscode, review]
created: 2026-10-11
---

## Acceptance criteria
- [ ] A **Changes** view lists working-tree and staged changes under doc roots, grouped by doc, with per-file stats, built on the vscode.git API (no git re-implementation).
- [ ] A commit composer (webview view) drafts a message from the changed docs (titles, sections touched), shows the trailers that will be added (Signed-off-by when git.alwaysSignOff, the AI co-author trailer when git.addAICoAuthor applies, an Agent-draft disclosure when the message was drafted), and offers Commit, Commit & Push and Open Pull Request.
- [ ] Commit and push go through the vscode.git API; the composer validates the changed docs first and blocks on errors.
- [ ] Open Pull Request hands off to the GitHub Pull Requests extension when installed, otherwise opens the compare URL for the current branch.
