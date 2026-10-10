# Hexagonal TypeScript monorepo with three drivers

- Status: accepted
- Date: 2026-10-09

## Decision

- **Layout:** one pnpm-workspaces monorepo. A pure `core` holds the ports, and adapters implement them (fs, `vscode.git`, git CLI, forges, provenance notes, secrets). Three drivers sit on top: `vscode`, `cli` (`gitleaf`) and `mcp-server`.
- **Toolchain:** Node LTS, TypeScript `strict`, ESM, Vitest, ESLint and Prettier, ajv for schemas.

## Consequences

- CI and agents outside VS Code get the same behavior as the extension.
- `core` can't import `vscode` or Node built-ins, and lint enforces that.
