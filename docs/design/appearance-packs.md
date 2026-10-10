# Appearance packs: specification (v1)

An **appearance pack** is a small VS Code extension that restyles Gitleaf's webviews without code. It declares tokens, assets and copy, and Gitleaf discovers and validates it. Packs can be public (Marketplace or Open VSX) or private (a VSIX built from a private repo).

## 1. Declaring a pack

In the pack's `package.json`:

```jsonc
{
  "name": "acme-appearance",
  "publisher": "acme",
  "engines": { "vscode": "^1.90.0" },
  "categories": ["Themes"],
  "keywords": ["gitleaf-appearance"],              // makes the pack findable in the Extensions view
  "contributes": {
    "gitleaf.appearances": [{
      "id": "acme",                                  // unique within the pack; global id = <publisher>.<name>/<id>
      "label": "Acme",
      "description": "Acme brand for Gitleaf",
      "tokens": "./appearance/acme.tokens.css",      // required
      "mascot": { "dir": "./assets/mascot", "map": "./appearance/mascot.map.json" },   // optional
      "copy":   { "en": "./appearance/copy.en.json", "es": "./appearance/copy.es.json" }, // optional
      "logo": "./assets/logo.svg"                    // optional
    }],
    "configurationDefaults": { "gitleaf.appearance": "acme" },   // optional: become the default where installed
    "productIconThemes": [ /* optional: workbench icons */ ]
  }
}
```

## 2. Discovery and selection

- Gitleaf scans `vscode.extensions.all` for `packageJSON.contributes["gitleaf.appearances"]` and re-scans on `vscode.extensions.onDidChange`. This is the same pattern the built-in Markdown extension uses for `markdown.previewStyles`.
- The setting `gitleaf.appearance` takes `"default"` or a pack id.
  - **Precedence:** the user's explicit setting, then a pack's `configurationDefaults`, then `"default"`.
  - **Missing pack** (uninstalled, or not present on this machine): Gitleaf silently falls back to `"default"` and logs a note to its output channel.
- Commands:
  - **Gitleaf: Select Appearance:** a quick pick with live preview of the focused item in open Gitleaf webviews.
  - **Gitleaf: Find Appearance Packs:** opens the Extensions view searching for the `gitleaf-appearance` keyword.
  - **Gitleaf: Install Appearance Pack from VSIX…:** runs VS Code's install-from-VSIX command.
  - **Gitleaf: Remove Appearance Pack…:** lists installed packs and uninstalls the chosen one after confirmation.
  - **Gitleaf: Create Appearance Pack:** scaffolds a pack folder from a template (v1).

## 3. What a pack may change

| Allowed | Not allowed |
|---|---|
| Tier 1 and Tier 2 `--gl-*` custom properties, including radii, gradients, shadows, voice colors and mascot size | Any selector other than `:root`, `body.vscode-light`, `body.vscode-dark` and `body.vscode-high-contrast` |
| `url()` pointing to files inside the pack (fonts, SVG) | `@import`, external URLs, `expression()`, `-moz-binding`, `behavior` |
| SVG assets | `<script>`, `on*` attributes, `<foreignObject>`, external `href`s. These are stripped, and the pack is rejected if any are found |
| JSON copy strings, rendered as **text** | HTML in copy. It is escaped |
| A mascot map of moment → face → voice | Showing the mascot in errors, security, secrets, Restricted Mode or permission prompts. Gitleaf ignores those moments |

Gitleaf adds the pack's folder to the webview `localResourceRoots`, limited to the declared files.

## 4. Moments a mascot may use

`walkthrough-welcome`, `empty-docs`, `no-results`, `waiting-for-review`, `review-approved`, `doc-merged`, `merge-conflict`, `validation-summary`, `broken-links`, `agent-draft-ready`, plus agile-module moments (`poker-outlier`, `poker-consensus`).

The `gitleaf.mascot` setting takes `subtle` (the default), `playful` or `off`. Under a screen reader, mascots are hidden and the text is kept.

## 5. Distribution and updates

| Kind | Install | Updates |
|---|---|---|
| Public pack | Marketplace or Open VSX | Automatic |
| Private pack | `code --install-extension pack.vsix [--profile <name>]` | Manual: re-run the install script. Settings Sync doesn't install VSIX-only extensions on other machines |
| Enterprise | Private Marketplace (GitHub Enterprise customers) | Automatic |

## 6. Testing a pack

`gitleaf appearance check <path-to-pack>` (CLI, v1) validates the manifest, CSS allowlist, SVG sanitization and contrast of voice colors against the four theme kinds. It prints the same report Gitleaf uses at load time.
