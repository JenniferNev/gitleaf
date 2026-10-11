---
schema: gitleaf/item@1
id: ST-S0F2W4BA
type: story
title: "MCP server v0 for Copilot and Claude (search, read, validate)"
status: in-review
priority: high
epic: EP-0RQVJECD
points: 5
depends_on: [ST-PV13MRCY]
labels: [agents]
created: 2026-10-09
---

## Acceptance criteria
- [ ] A stdio MCP server exposes `docs_search`, `docs_read` and `docs_validate`. Results wrap file content as untrusted data.
- [ ] The extension registers it through `mcpServerDefinitionProviders`. `plugins/claude/.mcp.json` registers it for Claude Code, and `.claude-plugin/marketplace.json` lists the plugin.
- [ ] One shipped skill (`docs-review`) in `plugins/claude/skills/`, also contributed through `chatSkills`.
- [ ] The server refuses any approve or merge request, whatever the client asks for.
