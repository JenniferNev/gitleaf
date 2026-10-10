# Rename to Gitleaf and refocus on documentation

- Status: accepted
- Date: 2026-10-09

## Context

The project began as "RepoScrum", focused on Scrum in a single repo. The real goal is to remove external documentation tools entirely: keep every doc in git, attributable line by line, and manageable by agents. The name "VSDocs" was considered and rejected:

- Microsoft's VS Code brand rules forbid "VS Code" in product names and forbid combining Microsoft marks with other terms.
- Microsoft itself used "VSDocs" for its Visual Studio docs repo.
- A `vsdocs` organization already exists on GitHub.

## Decision

- The product name is **Gitleaf**. Where compatibility needs stating, it is "Gitleaf for VS Code".
- Docs are the core. Multi-repo is first-class.
- Scrum and agile ceremonies become an optional module that reuses the same core.

## Consequences

- The roadmap is reordered: docs core, then review and git, then provenance, then the agent layer, then import, then appearance, then the agile module.
- Before publishing, check the Marketplace, Open VSX, USPTO and IMPI for "Gitleaf" conflicts. This could not be verified at decision time.
