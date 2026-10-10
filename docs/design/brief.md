# Design System Brief: Gitleaf (public)

> **For Claude Design.** Create the **public** design system for Gitleaf, an open-source (MIT) VS Code extension that replaces external documentation tools with Markdown in git, reviewable and agent-managed.
>
> This system must contain **no personal identity**: no mascot, personal icons, logo, slogan or signature shapes. Personal identity ships separately as a private *appearance pack* (see `appearance-packs.md`). Design so a pack can restyle tokens without touching components.
>
> Hard constraints are in §3 and §12. Where something is left open, propose options (§15).

---

## 1. What Gitleaf is

Teams stop using Confluence, Notion and SharePoint. Their docs live as Markdown in one or many git repos.

- **Reviewed like code:** a doc change becomes a PR, gets reviewed and is merged inside VS Code.
- **Attributable:** for every line you can see who wrote it, human or agent, and who approved it.
- **Agent-managed:** Copilot and Claude create, edit, import and summarize docs through the same tools a person uses.

An agile module (board, planning poker, retros) is optional and comes later.

## 2. Surfaces

| Surface | Rendered by | Design system role |
|---|---|---|
| Docs explorer across repos, owners, freshness, status | Native tree view | Guidelines only: icons, labels, descriptions, badges |
| Markdown editing and preview, diffs, merge editor, blame, graph, timeline | **VS Code built-ins** | Gitleaf doesn't redraw these. It themes them (§5.4) and adds hovers and CodeLens |
| Provenance hover ("written by…, edited by agent…, approved by…") | Native hover (Markdown) | Content pattern and icon guidelines |
| Doc info panel (frontmatter form, backlinks, review state) | Webview view (sidebar) | **Full system** |
| Changes and commit composer (grouped by doc, agent-drafted message, trailers preview) | Webview view | **Full system** |
| Review panel for Azure DevOps (threads, vote, complete/merge) and the agent review summary card | Webview panel | **Full system** |
| Provenance view (human/agent share per doc over time, line-range list) | Webview panel | **Full system** (charts) |
| Agent activity (what agents changed, pending proposals, confirmations) | Webview view | **Full system** |
| Docs health (broken links, stale docs, missing owners) | Webview panel plus the Problems panel | Full system |
| Import wizard (Confluence, Notion, Google Docs, SharePoint → Markdown) | Webview panel | Full system |
| Appearance picker | Native quick pick plus live preview | Guidelines |
| Agile module (later) | Webviews | Full system, later |
| Marketplace, docs site, README | Outside VS Code | **Neutral Gitleaf brand** (§11) |

## 3. The hard rule: native structure, Gitleaf accents

- **Structure follows the user's theme.** Surfaces, text, borders, inputs, buttons, focus, selection and fonts come from the active VS Code theme through `--vscode-*` variables. The `<body>` carries `vscode-light`, `vscode-dark` or `vscode-high-contrast`, plus `vscode-reduce-motion` and `vscode-using-screen-reader` when those apply.
- **Accents** (status, provenance, review state, charts) are **contributed colors** with defaults per theme kind. Users and themes can override them.
- **Contributed color ids have exactly one dot:** `gitleaf.provenanceAgent` reaches webviews as `--vscode-gitleaf-provenanceAgent`. VS Code replaces only the first dot, so a second dot would break the variable name.
- **High-contrast themes** fall back to theme colors and get no tints.

## 4. Principles

1. **Comfort: native first.** If VS Code has the control or view, use it. Gitleaf should feel like part of the editor.
2. **Text is the product and git is the database.** Every view shows which file and which commit it represents. The raw file is always one action away.
3. **Provenance is always visible, never loud.** Agent-written lines are identifiable at a glance without shaming or decorating them.
4. **Motion that explains.** Use 100–150ms transitions for state changes only.
5. **Wow, saved for moments that earn it:** a merge, a doc going from draft to published, an import that finishes. Every one of these respects reduced motion.
6. **Safe by default.** Agents propose and humans approve. Secrets are never shown. Restricted Mode is obvious.

## 5. Tokens

### 5.1 Tiers

```
Tier B  Brand primitives  (hex; tokens/palette.tokens.json)
Tier 0  Host theme        --vscode-*            (runtime; never defined by Gitleaf)
Tier 1  Semantic          --gl-*                → Tier 0 for structure, contributed colors for accents
Tier 2  Component         --gl-card-*, --gl-diff-* …  → Tier 1 only
```

Component CSS references Tier 1 and Tier 2 only. **There are no hex values in component CSS.** Appearance packs override Tier 1 and Tier 2 tokens and nothing else.

### 5.2 Public palette and contrast (measured)

| Primitive | Hex | Role |
|---|---|---|
| Sky | `#4AB3F8` | functions, links, info, modified |
| Butter | `#F7F099` | strings, headings (dark), primary button; **fill only on light grounds** |
| Pink | `#FC4CBC` | keywords, errors, deleted |
| Violet | `#CF3BF7` | types, conflicts |
| Purple | `#962DCF` | regex; needs a lighter variant on dark grounds (`#B05FDC`, 4.67:1) |
| Plum | `#53235E` | status bar, selection, headings (light) |
| **Leaf** | `#5EE6A8` | **functional green**: added, success, numbers. Added because git and terminals need it |
| Ink / Paper | `#040F16` / `#F8F8F8` | dark and light grounds |

Measured values for every pair are in `packages/themes`: run `gen_theme.py` for the report. Every text pair is at least 4.5:1 and every graphic pair at least 3:1 in Gitleaf Ink and Paper. Light-theme text variants: Sky `#0879C4`, Butter→Mustard `#7F760A`, Pink `#DE048F`, Violet `#C00AF1`, Leaf `#158652`.

### 5.3 Tier 1 inventory (starting point)

- **Structure:** `--gl-text`, `-muted`, `-disabled`, `--gl-link`, `--gl-surface` (inherit host), `-raised`, `-hover`, `-selected`, `--gl-border`, `--gl-focus`, `--gl-shadow`, plus controls. These map to `foreground`, `descriptionForeground`, `editorWidget.background`, `list.*`, `widget.border`, `focusBorder`, `button.*`, `input.*` and so on.
- **Provenance (contributed):** `gitleaf.provenanceHuman`, `gitleaf.provenanceAgent`, `gitleaf.provenanceMixed`, `gitleaf.provenanceUnknown`.
- **Review (contributed):** `gitleaf.reviewDraft`, `gitleaf.reviewOpen`, `gitleaf.reviewChanges`, `gitleaf.reviewApproved`, `gitleaf.reviewMerged`.
- **Doc status (contributed):** `gitleaf.docDraft`, `gitleaf.docPublished`, `gitleaf.docStale`, `gitleaf.docArchived`.
- **Feedback:** `errorForeground`, `editorWarning.foreground`, `editorInfo.foreground`, `testing.iconPassed`.
- **Charts:** series 1–6 per theme kind, plus `charts.foreground` and `charts.lines`.

**Color is never the only signal.** Every color-coded state also has an icon or label.

### 5.4 Theming VS Code itself

The optional **Gitleaf Ink** and **Gitleaf Paper** color themes (in `packages/themes`, a separate extension) apply the palette to the whole workbench. That includes git decorations, the diff and merge editors and the SCM graph. Design the in-extension UI so it looks right under **any** theme, not only these two.

## 6. Customization (easy to install, switch, add and remove)

1. **Default:** theme-native structure with Gitleaf accents.
2. **Color theme (optional):** Gitleaf Ink or Paper, or any other theme.
3. **Appearance pack (optional extension):** restyles Tier 1 and Tier 2 tokens and adds assets and copy. Switch packs with **Gitleaf: Select Appearance** (live preview). Remove one by uninstalling it, which reverts to neutral automatically.
4. **Overrides:** `workbench.colorCustomizations` for contributed colors, scoped per theme if needed (`"[Gitleaf Ink]": {…}`).
5. **Settings:** density, provenance display (`gutter`, `hover`, `off`), chart style, display font (`brand` Chakra Petch numerals, or `native`).

## 7. Foundations

- **Typography inside the editor.** Use the VS Code font and size. IDs, hashes and code use the editor font. **Chakra Petch** (OFL, bundled woff2 subset) is optional and only for display numerals and titles. The docs site uses Chakra Petch for display and Poppins for body.
- **Spacing:** 4px base: 2, 4, 6, 8, 12, 16, 20, 24, 32.
- **Radius:** standard: 2px controls, 4px cards, 6px popovers. *Signature shapes belong to appearance packs.*
- **Elevation and motion.** Mostly flat, with `widget.shadow` for popovers. Motion is 100–150ms; celebrations run up to 400ms and are skippable.
- **Icons.** Codicons everywhere. Up to about 8 custom glyphs in codicon style for concepts codicons lack: provenance-agent, provenance-human, doc-stale, import, review-summary. They ship as an icon font through `contributes.icons`.

## 8. Accessibility (non-negotiable)

- Meet WCAG 2.2 AA. Every text pair is at least 4.5:1 and every graphic pair at least 3:1 in each theme kind.
- Keyboard paths exist for everything. The focus ring is 1px `focusBorder`.
- Live regions announce review and merge results.
- Respect reduced motion and screen-reader mode.
- Localization: English and Spanish at launch through `vscode.l10n`.

## 9. Components (MVP first)

**States for every interactive component:** default, hover, focus, active, selected, disabled, **read-only (Restricted Mode)**, loading, error, empty, **stale** (the file changed on disk or has a conflict).

### MVP

- **Primitives:** buttons (primary, secondary, icon, split), input, select, checkbox, badge, tag, **hash/ID chip** (editor font, copy on click), **person/agent chip** (initials avatar, or an agent glyph plus the model name), status pill, tooltip and hover card, banner (info, warning, error, restricted), empty state, skeleton.
- **Provenance:**
  - line-range list row: lines, author or agent, commit, PR, approver
  - per-doc share bar (human / agent / mixed)
  - timeline sparkline
  - hover-card content pattern
- **Changes and commit composer:** changes grouped by doc; per-file stats; an agent-drafted message with an **"Edited by agent"** disclosure; a preview of the trailers that will be added; Commit, Commit & Push and Open PR actions.
- **Review panel (Azure DevOps) and review summary card:** thread list, inline thread, vote control (approve, approve with suggestions, wait, reject), merge/complete with a policy-check list, and an agent summary showing what changed, risks and unresolved threads.
- **Doc info panel:** frontmatter form, owners, tags, status, backlinks and outgoing links (broken ones flagged), and an "Open raw" action.
- **Agent activity:** a feed of proposals, edits, confirmations and refusals. Each item links to its diff.

### v1

- Docs health dashboard and import wizard (a source picker plus a mapping preview of pages to files, links and images).
- Static docs site theme (the brand layer).
- Agile module: board, async poker, retro.

## 10. Layout

| Placement | Size | Behavior |
|---|---|---|
| Sidebar webview views | 220–480px | Single column |
| Bottom panel | Wide, 150–400px tall | Horizontal lists |
| Editor-area panels | 480–2000px+ | Two-pane layouts allowed |

Breakpoints are 360px and 720px. Scrollbars stay native.

## 11. Neutral Gitleaf brand (Marketplace, docs site, README)

Propose **2–3 marks** built on a leaf, page or branch idea. Each must:

- read in monochrome at 16px and 24px
- work as a full-color 256×256 Marketplace PNG
- come with a wordmark
- **not** resemble the author's private mascot or any Microsoft, GitHub, Git, Atlassian or Notion mark

The banner color comes from the public palette (Ink or Plum). The docs site has dark (Ink) and light (Paper) versions built from the same tokens.

## 12. Technical constraints

- Webview CSP is `default-src 'none'`. Only local scripts, styles and fonts load, with no remote resources.
- Components are plain CSS over tokens, or web components built on VSCode Elements (MIT, built on Lit). Don't use Microsoft's deprecated Webview UI Toolkit.
- Sanitize all repo content before rendering.
- Charts are inline SVG.
- Appearance packs provide only `--gl-*` CSS properties, sanitized SVG and JSON copy.

## 13. Licensing

- MIT.
- Fonts are OFL. Codicons are CC BY 4.0 and need attribution.
- No third-party marks. "Gitleaf for VS Code" is the allowed compatibility form.

## 14. Deliverables

1. **Design System:** a README, the token tiers with previews in four theme kinds (Dark Modern, Light Modern, HC Dark, HC Light) **and** in Gitleaf Ink and Paper, the components and states in §9, and guidelines.
2. **Exports:** `tokens.css` (Tier 1 and 2), a `contributes.colors` JSON block (single-dot ids, four defaults each), and an update to `palette.tokens.json` if you refine the palette.
3. **Icons:** custom glyph SVGs (16×16) and a 24×24 Activity Bar icon from the neutral mark.
4. **Brand:** 2–3 neutral marks, then the chosen mark, the Marketplace PNG and the banner.
5. **Later:** prototypes of the commit composer, the ADO review panel and the provenance view as Design artifacts, handed off to Claude Code.

**Preview harness.** Use approximate `--vscode-*` values per theme kind, labeled as approximations. These values never go into `tokens.css`.

## 15. Open questions: propose options

1. How visible agent-written lines should be: gutter only, a subtle tint, or hover only. Choose a default.
2. Whether the functional Leaf green feels like part of the palette or needs a hue shift.
3. Provenance chart form: share bar or stacked timeline.
4. Whether to show model names (for example "Claude", "Copilot") or only "agent".

## 16. Sample data (real-looking)

| Doc | Repo | Status | Owners | Last change | Provenance |
|---|---|---|---|---|---|
| `docs/release-process.md` | platform-docs | in review (PR #42) | sam, li | 2 hours ago | 62% human, 38% agent (Claude) |
| `docs/onboarding/setup.md` | platform-docs | published | maria | 3 days ago | 100% human |
| `docs/api/auth.md` | payments-api | stale (90+ days) | — (missing owner) | 4 months ago | 80% human, 20% agent (Copilot) |
| `docs/runbooks/rollback.md` | payments-api | draft | ahmed | 10 minutes ago | agent proposal awaiting review |
| `docs/legacy/confluence-import/*.md` | platform-docs | imported, 12 pages | sam | today | import tool + human cleanup |

Sample review: PR #42 "Release process: publish on approval". It has 2 approvals needed, 1 unresolved thread, and the agent summary reads "3 sections rewritten; one link to `branching.md` updated; no secrets touched."
