---
schema: gitleaf/item@1
id: ST-0NRSMHJS
type: story
title: "Provenance hover, CodeLens and view, with GitHub approvals"
status: in-review
priority: high
epic: EP-XWARXVAT
points: 8
depends_on: [ST-E4PMXQ19]
labels: [vscode, provenance]
created: 2026-10-11
---

## Acceptance criteria
- [ ] Hovering a line in a doc shows person or agent, commit and date, and for lines that reached main through a pull request, the PR number and who approved it.
- [ ] A CodeLens at the top of each doc shows the human/agent/mixed share; clicking opens the **Provenance** view (webview, strict CSP, --gl-* tokens) with the share bar and a line-range list that reveals lines on click.
- [ ] Blame runs through the git binary exposed by the vscode.git API (porcelain), via the shared parser; results are cached per document version.
- [ ] The forge-github adapter resolves commit → pull request → approvers through the GitHub REST API using the VS Code GitHub authentication session; no token is stored by Gitleaf. Without a session the hover degrades to commit level.
- [ ] gitleaf provenance --json includes pullRequest and approvedBy when GITHUB_TOKEN (or gh auth) is available.
