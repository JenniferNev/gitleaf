# Gitleaf for VS Code

Documentation as Markdown in git: reviewable like code, attributable line by line to a person or an agent, and manageable by Copilot and Claude under human review.

**Status: pre-release.** This build registers the Gitleaf MCP server for Copilot (tools `docs_search`, `docs_read`, `docs_validate`) and ships the `docs-review` skill. Views, provenance hovers and the appearance system arrive in later builds.

## Use

1. Open a repository that has a `gitleaf.yaml` (or a `docs/` folder).
2. In Copilot Chat, the **Gitleaf** MCP server is available; ask it to search, read or validate docs.
3. The same server and skill are available to Claude Code through the plugin in the repository's `plugins/claude` folder.

The server never approves or merges pull requests.

## License

MIT. Codicons (CC BY 4.0), Chakra Petch and Poppins (OFL) are credited in `NOTICE` at the repository root.
