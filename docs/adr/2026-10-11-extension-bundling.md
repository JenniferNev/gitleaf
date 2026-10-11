# Bundle the extension with esbuild; ship the MCP server inside it

- Status: accepted
- Date: 2026-10-11

## Context

The monorepo is ESM TypeScript (`2026-10-09-hexagonal-typescript-monorepo.md`). A VS Code extension is loaded by the extension host from a single entry file and cannot resolve workspace packages at runtime. The MCP server must be startable by VS Code (through `mcpServerDefinitionProviders`) and by Claude Code (through the plugin's `.mcp.json`) without a build step on the user's machine.

## Decision

- `packages/vscode` is bundled with **esbuild** (MIT). Source stays ESM; the extension entry is emitted as **CommonJS** (`dist/extension.js`), which every supported VS Code version loads, with `vscode` left external.
- The MCP server is bundled by the same build into **two copies** of one ESM file: `packages/vscode/dist/gitleaf-mcp.js` for the extension to start, and `plugins/claude/server/gitleaf-mcp.js` for the Claude Code plugin. Both are build outputs and are not committed.
- The shipped skills live once in `plugins/claude/skills/`; the extension build copies them to `packages/vscode/skills/` because `contributes.chatSkills` paths must be inside the extension.
- `pnpm --filter gitleaf package` produces the VSIX with `@vscode/vsce`.

## Consequences

- One `pnpm build` yields everything: library `dist/` folders, the extension bundle, the server bundle in both places and the skills copy.
- Publishing `@gitleaf/mcp-server` to npm later lets `.mcp.json` switch to `npx`, but nothing depends on that.
- Bundled code must stay free of dynamic `require`s that esbuild cannot follow; the MCP SDK and ajv are fine.
