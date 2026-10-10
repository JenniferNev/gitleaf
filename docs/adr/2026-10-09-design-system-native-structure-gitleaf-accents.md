# Design system: native structure with Gitleaf accents

- Status: accepted (palette details pending the Claude Design pass). The identity parts of the original draft are superseded by `2026-10-09-public-design-private-identity.md`.
- Date: 2026-10-09

## Context

The author's personal design system gives the product its palette and foundations. VS Code users run every kind of theme, including light and high contrast, and that palette was tuned for a dark background.

## Decision

- **Inside the editor,** structural UI (surfaces, text, borders, controls, focus, fonts) resolves to `--vscode-*` theme variables.
- **The public Gitleaf palette supplies the accents:**
  - status, type and chart colors, with a value per theme kind declared as contributed colors
  - Chakra Petch numerals, bundled (OFL)
- **Signature shapes, mascot and other identity** are not part of the public system. They ship in private appearance packs (see the superseding ADR).
- **High-contrast themes** fall back to theme colors with no gradients or glows.
- **The brand layer** (Marketplace, docs site, README) uses the neutral Gitleaf brand.
- Users can switch accents to `theme`, override any contributed color, or install an appearance pack.

## Consequences

- The extension feels native in every theme and still reads as Gitleaf through its accents.
- Every accent needs measured contrast per theme kind. Butter is a fill only on light themes, and Purple needs a lighter variant on dark themes.
- The full spec is in `docs/design/brief.md`.
