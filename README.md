# Gitleaf

Documentation as Markdown in git: reviewable like code, attributable line by line to a person or an agent, and manageable by Copilot and Claude under human review. Gitleaf for VS Code, a `gitleaf` CLI and one MCP server share a pure TypeScript core.

**Status:** Phase 0, Foundations. Nothing is published yet. The backlog is in [`agile/items/`](agile/items/) and decisions are in [`docs/adr/`](docs/adr/).

## Layout

```
packages/
  core/           domain model + ports (pure TS; depends on nothing)
  schema/         JSON Schemas + migrations
  format/         canonical Markdown/frontmatter parse + serialize
  index/          multi-repo doc index, links, search
  provenance/     blame + trailers + Agent Trace notes
  adapters/*      fs-node, fs-vscode, git-cli, git-vscode, forge-*, secrets-*
  cli/            the `gitleaf` binary
  mcp-server/     stdio MCP server for Copilot and Claude
  vscode/         the extension
  themes/         Gitleaf Ink and Paper color themes (separate extension)
docs/             architecture, ADRs, design, research
agile/            this repo's own backlog
```

## Develop

```sh
pnpm install && pnpm build && pnpm test && pnpm lint
```

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`AGENTS.md`](AGENTS.md).

## License

MIT. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
