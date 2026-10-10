# One MCP server and one skill set for Copilot and Claude

- Status: accepted (supersedes the earlier `.agents/skills` suggestion)
- Date: 2026-10-09

## Context

Both GitHub Copilot in VS Code and Claude Code must manage docs. VS Code extensions can register MCP servers (`mcpServerDefinitionProviders`), bundle skills (`chatSkills`) and contribute tools (`languageModelTools`). Claude Code plugins bundle `skills/` and `.mcp.json` and are installed from a marketplace repo. VS Code Agent Plugins also read the Claude plugin format and the `extraKnownMarketplaces` / `enabledPlugins` keys in `.claude/settings.json`.

## Decision

- **One stdio MCP server** (`packages/mcp-server`) exposes Gitleaf use cases: search, read, create, edit, validate, propose change, summarize review, and provenance lookup.
  - The extension registers it for Copilot.
  - `plugins/claude/.mcp.json` registers it for Claude.
- **Skills are written once** as `SKILL.md` in `plugins/claude/skills/`. The extension also ships them through `chatSkills`.
- **`languageModelTools`** are used only for actions that need VS Code APIs, such as opening a diff or revealing a line.
- **User repos** get a `.claude/settings.json` that adds the Gitleaf marketplace and enables the plugin.

## Consequences

- One implementation serves both agents.
- Tool confirmations differ by host. The server itself refuses approve and merge actions, whatever the client.
