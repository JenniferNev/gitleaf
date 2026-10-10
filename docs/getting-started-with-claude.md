# Getting started: building Gitleaf with Claude Code and Claude Design

## Two repositories

| Repo | Visibility | License | Contains |
|---|---|---|---|
| `gitleaf` (this pack) | **Public** | MIT | Extension, CLI, MCP server, themes, public design system, docs |
| *(your identity pack)* | **Private** | All rights reserved | The owner's personal appearance pack: mascot, personal icons, signature shapes, voice, logo |

Claude Code reads context from the repo it's opened in (`AGENTS.md`, `CLAUDE.md`, `.claude/`), from artifacts on your claude.ai account (by URL or `/artifacts`), and from Claude Design handoffs. It can't read claude.ai chat Project documents, so the repos are the source of truth.

## Step by step

### 1. Create the two repos (15 min)
1. Create a **public** GitHub repo `gitleaf` with the MIT license. Copy this pack in, then commit and push.
2. Create a **private** repo for your identity pack and copy it in. Never add it as a submodule or dependency of the public repo.
3. Run `scripts/check-identity.sh` in the public repo. It must pass. Once ST-Z3EH27SE lands, CI runs it on every PR.

### 2. Try the themes (5 min)
- Install `gitleaf-themes-0.1.0.vsix` (Extensions view: `…` > **Install from VSIX…**), then pick **Gitleaf Ink** or **Gitleaf Paper**.
- To follow your OS light/dark setting, set `window.autoDetectColorScheme: true`, `workbench.preferredDarkColorTheme: "Gitleaf Ink"` and `workbench.preferredLightColorTheme: "Gitleaf Paper"`.

### 3. Install your identity, on your machines only (5 min per machine)
- Follow the private pack's README: run its install script, then pick its product icon theme once.
- Once Gitleaf is installed, its default appearance becomes yours on these machines. Nobody else gets it.

### 4. Two design systems in Claude Design (parallel with step 5)
1. **Public:** a new design system from `docs/design/brief.md`, plus `packages/themes/tokens/palette.tokens.json` and screenshots of the two themes. Publish it, then paste its URL into `docs/design/README.md`.
2. **Private:** a separate design system from the private pack's `docs/identity-brief.md` and its source assets. Keep it private, and keep its exports in the private repo only.

### 5. Set up Claude Code (5 min)
- Install the Claude Code VS Code extension and `/login` with the same claude.ai account.
- Open the **public** repo and run `/context`. Confirm that `CLAUDE.md` and `AGENTS.md` are loaded.

### 6. First story: the scaffold (ST-Z3EH27SE)
Switch to plan mode and send:
> Read AGENTS.md, docs/architecture.md and agile/items/ST-Z3EH27SE-scaffold-monorepo.md. Propose a plan for this story only and wait for my approval. Use branch story/ST-Z3EH27SE-scaffold and the Agile-Item trailer.

Next stories, in dependency order: ST-1BEP9591 → ST-KT3NG4K8 → ST-96WHP0KK → ST-PV13MRCY → ST-FBZGADRT → ST-S0F2W4BA → ST-TXRQTR8G.

### 7. Design into code (ST-TXRQTR8G, after step 4)
> Read the Design System artifact at <URL>, docs/design/brief.md and docs/design/appearance-packs.md. Implement ST-TXRQTR8G. Plan first.

## Rules of thumb
- Design changes go Claude Design → export → PR. The repo wins on conflicts.
- Identity changes happen only in the private repo, followed by re-running its install script.
- For UI prototypes, use Claude Design and then **Export → Hand off to Claude Code**, or `/design <brief>` inside Claude Code.
