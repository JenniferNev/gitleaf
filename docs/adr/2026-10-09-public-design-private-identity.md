# Public design system, private identity, appearance packs

- Status: accepted
- Date: 2026-10-09

## Context

The author's personal design system supplies the colors and foundations. Her **identity** must stay private and must not be MIT-licensed:
- mascot
- personal icons
- logo
- slogan and voice
- signature shapes (diagonal corners, tab buttons, gradients, glow, gradient rail)

Gitleaf should look neutral for everyone and carry her identity by default **only on her machines**. Appearances must be easy to install, switch, add and remove.

## Decision

- **Public (MIT, this repo):** the palette (Sky, Butter, Pink, Violet, Purple, Plum, Ink, Paper, plus the functional Leaf green), type (Chakra Petch for display, Poppins for docs; both OFL), spacing, radius and motion scales, semantic tokens, components, and the **Gitleaf Ink** and **Gitleaf Paper** color themes, shipped as a separate extension.
- **Private (owner's private repo, all rights reserved):** an appearance pack extension containing the mascot, personal icons (as a product icon theme), signature shapes and gradients, voice copy and logo.
- **Appearance packs are declarative.** An extension declares `contributes["gitleaf.appearances"]` with a tokens CSS file (only `--gl-*` properties), sanitized SVG assets and JSON copy. Gitleaf discovers packs through `vscode.extensions.all` and `extensions.onDidChange`, the same pattern the built-in Markdown extension uses for `markdown.previewStyles`. **No pack code runs in webviews.**
- **"Default only for her"** uses the private pack's `configurationDefaults: { "gitleaf.appearance": "<pack>" }`. Where the pack is installed, it becomes the default; uninstalling it reverts to neutral. There is no user detection in public code.
- **Webview color ids use one dot** (`gitleaf.reviewApproved`), because webviews replace only the first dot.
- **CI identity guard:** `scripts/check-identity.sh` fails the build if identity assets or names enter this repo.

## Consequences

- Third parties can publish their own packs, for example company branding.
- Packs installed from a VSIX don't auto-update or install through Settings Sync, so the owner uses an install script per machine.
- Bundling color themes inside the main extension would open a theme picker for every user on install, so the themes ship as a separate extension.
