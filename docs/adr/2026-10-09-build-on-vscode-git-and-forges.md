# Build on vscode.git and forge tooling; don't build a git client

- Status: accepted
- Date: 2026-10-09

## Context

People must review commits, approve and merge from the UI, with agent support. VS Code already ships Source Control, a graph, inline blame, a timeline, a 3-way merge editor and rendered Markdown diffs. Its Git extension API exposes status, commit, branches, fetch/pull/push, `merge`, `rebase` (VS Code 1.112+), `log`, `blame` and diffs across multiple repositories. The GitHub Pull Requests extension covers GitHub review, approval and merge. There is **no official Azure DevOps PR UI** in VS Code; the old Azure Repos extension was archived in 2020.

## Decision

- **Local git:** use the `vscode.git` API only, with the git CLI adapter for CLI and CI.
- **Built-in views:** open them with their commands; never re-implement them. Gitleaf ships recommended settings: rendered Markdown diffs, link validation, link updates on move.
- **GitHub:** hand off review to the GitHub Pull Requests extension through its commands. Gitleaf adds a provenance overlay and an agent review summary.
- **Azure DevOps:** Gitleaf builds a small review panel (threads, vote, complete/merge) using the ADO REST API or the official ADO MCP server. This is the only forge UI Gitleaf owns.

## Consequences

- There's much less UI to build and maintain.
- Gitleaf depends on the API surface of the GitHub PR extension, which is narrow, so integration is command-level only.
- The ADO panel needs Microsoft Entra / PAT auth stored in VS Code SecretStorage.
