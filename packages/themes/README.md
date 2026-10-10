# Gitleaf Themes

Two color themes for VS Code from the Gitleaf design system:

- **Gitleaf Ink**: dark, on an ink-blue ground
- **Gitleaf Paper**: light, on a paper ground

Every syntax color, description and UI text color meets at least **4.5:1** contrast against its background. Graphic elements such as gutter marks, focus rings and line numbers meet at least **3:1**. `scripts/gen_theme.py` generates the themes from `tokens/palette.tokens.json`, prints a contrast report, and fails on any color pair below these targets.

## Install

- **From a VSIX:** in the Extensions view, open `…` and choose **Install from VSIX…**, or run `code --install-extension gitleaf-themes-0.1.0.vsix`.
- Then run **Preferences: Color Theme** and pick **Gitleaf Ink** or **Gitleaf Paper**.

To switch automatically with your OS light and dark mode, add this to your settings:

```jsonc
"window.autoDetectColorScheme": true,
"workbench.preferredDarkColorTheme": "Gitleaf Ink",
"workbench.preferredLightColorTheme": "Gitleaf Paper"
```

## Customize without forking

Override any color for one theme only:

```jsonc
"workbench.colorCustomizations": {
  "[Gitleaf Ink]": { "statusBar.background": "#040F16" }
},
"editor.tokenColorCustomizations": {
  "[Gitleaf*]": { "comments": "#8F8F8F" }
}
```

## Color roles

| Role | Ink | Paper |
|---|---|---|
| Keywords, errors, deleted lines | Pink | Pink (deepened) |
| Strings, inline code, warnings | Butter | Mustard (Butter deepened for text) |
| Functions, links, modified lines | Sky | Sky (deepened) |
| Types, conflicts | Violet | Violet (deepened) |
| Numbers, added lines, success | Leaf | Leaf (deepened) |
| Markdown headings | Butter, bold | Plum, bold |
| Status bar | Plum | Plum |

The `leaf` green is a functional color. Git and terminal tools need a "success/added" color, and the base palette doesn't have one.

## Regenerate

```
python3 scripts/gen_theme.py scripts themes
```

## License

MIT. Fonts referenced in `tokens/` (Chakra Petch, Poppins) are under the SIL Open Font License and are not bundled in this package.
