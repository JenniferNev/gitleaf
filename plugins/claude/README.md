# Gitleaf plugin for Claude Code and VS Code agents

Bundles the Gitleaf MCP server (`docs_search`, `docs_read`, `docs_validate`) and the `docs-review` skill.

- `.mcp.json` starts the server from `server/gitleaf-mcp.js`, a single-file bundle that `pnpm build` writes here from `packages/mcp-server`. It is not committed: build once before enabling the plugin from a checkout. Releases will publish `@gitleaf/mcp-server` to npm and switch the command to `npx`.
- `skills/` holds the skills. The VS Code extension ships the same folder through `contributes.chatSkills`, so Copilot and Claude read one copy.
- The marketplace entry is `.claude-plugin/marketplace.json` at the repository root: add it with `/plugin marketplace add JenniferNev/gitleaf`, then `/plugin install gitleaf@gitleaf`.

The server never approves or merges anything. It refuses any tool call whose name says approve, merge or complete.
