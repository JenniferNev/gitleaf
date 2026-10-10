---
paths:
  - "packages/vscode/src/webview/**"
  - "packages/vscode/media/**"
  - "packages/vscode/**/*.css"
---

# Webview UI rules

- Use only `--gl-*` tokens. **No hex, rgb(), named colors or font stacks in component CSS.** Hex lives only in token files.
- Structural tokens resolve to `var(--vscode-…)`. Accent tokens resolve to contributed colors with **single-dot ids** (`gitleaf.reviewApproved` → `--vscode-gitleaf-reviewApproved`).
- CSP: `default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-…'; img-src ${webview.cspSource} data:; font-src ${webview.cspSource}`. Never relax it.
- Set `localResourceRoots` to the extension's `media`/`dist` folder plus the declared files of the active appearance pack, nothing else.
- Appearance packs are data: load the pack's tokens CSS only after validation (see `docs/design/appearance-packs.md`), sanitize SVGs, and render copy as text. Never execute pack JavaScript.
- Sanitize every string that comes from a workspace file before rendering it.
- Icons are Codicons or Gitleaf's contributed icon font. Avatars are initials only.
- Motion is 150ms or less (celebrations up to 400ms) and disabled under `body.vscode-reduce-motion`.
- Every drag action has a keyboard path and a command path.
- Before calling UI done, check it in Dark Modern, Light Modern, HC Dark, HC Light **and** Gitleaf Ink and Paper, at widths of 280, 600 and 1200px.
