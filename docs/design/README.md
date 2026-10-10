# Design system

| What | Where | Status |
|---|---|---|
| Public design brief for Claude Design (no personal identity) | [`brief.md`](brief.md) | ready |
| Appearance pack specification | [`appearance-packs.md`](appearance-packs.md) | ready (v1) |
| Palette and foundations (W3C design tokens) | `packages/themes/tokens/palette.tokens.json` | ready |
| Gitleaf Ink and Paper color themes (+ contrast generator) | `packages/themes/` | ready (0.1.0) |
| **Design System artifact** (browsable reference) | `<paste the claude.ai Design System URL here>` | pending |
| Implementation tokens | `packages/vscode/src/webview/styles/tokens.css` | pending (ST-TXRQTR8G) |

## Rules

1. **The repository is the source of truth.** Design changes follow one path: update in Claude Design, re-export, then open a PR that touches the tokens and `contributes.colors` together.
2. Component CSS uses `--gl-*` tokens only. Hex values live only in token files.
3. **No personal identity in this repo.** Mascots, personal icons, logos, slogans and signature shapes belong in appearance packs, and `scripts/check-identity.sh` enforces it in CI.
4. Contributed color ids have one dot (`gitleaf.reviewApproved`).
5. Decision record: [`../adr/2026-10-09-public-design-private-identity.md`](../adr/2026-10-09-public-design-private-identity.md).
