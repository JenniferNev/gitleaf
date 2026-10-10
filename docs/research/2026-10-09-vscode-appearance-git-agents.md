# Research: VS Code customization, git review and agent integration (2026-10-09)

This summarizes the findings behind ADRs 2026-10-09-*. Sources are listed per section. "Unverified" means the claim was inferred from VS Code source code or couldn't be confirmed.

## 1. Ways to customize VS Code appearance

| Mechanism | What it changes | How users switch | Notes |
|---|---|---|---|
| **Color theme** (`contributes.themes`) | Workbench colors, syntax (`tokenColors`) and semantic tokens | Preferences: Color Theme. With OS sync, it uses `workbench.preferredDark/LightColorTheme` | Installing a theme from the Extensions view opens a theme picker; installing a VSIX doesn't. `uiTheme`: `vs`, `vs-dark`, `hc-black`, `hc-light` |
| **Color customizations** | Any color, scoped per theme: `"[Gitleaf Ink]"`, `"[Gitleaf*]"` | User or workspace settings | `workbench.colorCustomizations`, `editor.tokenColorCustomizations`, `editor.semanticTokenColorCustomizations` |
| **Product icon theme** | Workbench icons, using a single-color font | Preferences: Product Icon Theme | Icons a theme doesn't define fall back to codicons (from VS Code source). Doesn't cover icons that extensions contribute |
| **File icon theme** | Explorer file and folder icons | Preferences: File Icon Theme | SVG, PNG or font |
| **Contributed colors** (`contributes.colors`) | An extension's own themable colors | Themes and users override them | In webviews: `--vscode-` + id with **only the first dot** replaced (from source), so use single-dot ids |
| **Profiles** | Settings, keybindings, extensions, snippets, tasks, MCP servers, UI state | Profiles menu; can be tied to a folder; export as a gist or `.code-profile` | No stable API for extensions to create profiles |
| **Walkthroughs** | Onboarding steps | Getting Started | A step can run `workbench.action.selectTheme` |
| **Custom CSS / UI font hacks** | Patch VS Code's own files | — | **Unsupported.** They mark the install "[Unsupported]", break on every update and need admin rights. Extensions have "no access to the DOM". Don't use them |

**Implications for Gitleaf:**
- Use only supported mechanisms.
- Ship the color themes as a **separate extension**, to avoid a theme picker popping up for every user who installs Gitleaf.
- Never write `workbench.colorTheme` without consent.
- Use a declarative `gitleaf.appearances` contribution for packs, the same pattern as Markdown's `markdown.previewStyles`.
- Use `configurationDefaults` so a pack becomes the default only where it's installed.

Sources:
- [Contribution points](https://code.visualstudio.com/api/references/contribution-points)
- [Themes: customize a color theme](https://code.visualstudio.com/docs/configure/themes#_customize-a-color-theme)
- [Product icon theme guide](https://code.visualstudio.com/api/extension-guides/product-icon-theme)
- [Webview theming](https://code.visualstudio.com/api/extension-guides/webview#theming-webview-content)
- [Webview theming source](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/webview/browser/themeing.ts)
- [Extension restrictions](https://code.visualstudio.com/api/extension-capabilities/overview#restrictions)
- [FAQ: "installation appears to be corrupt"](https://code.visualstudio.com/docs/supporting/faq#_installation-appears-to-be-corrupt-unsupported)
- [Profiles](https://code.visualstudio.com/docs/configure/profiles)
- [Markdown extension contributions](https://code.visualstudio.com/api/extension-guides/markdown-extension)
- [Extension packs](https://code.visualstudio.com/api/references/extension-manifest#extension-packs)
- [Extension install actions (picker after install, source)](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/extensions/browser/extensionsActions.ts)

## 2. Private distribution (for a personal appearance pack)

- **VSIX:** install with `code --install-extension file.vsix [--profile <name>]`. VSIX installs don't auto-update.
- **Settings Sync** syncs only the list of extensions, and the receiving machine installs them from the gallery. So a VSIX-only extension does **not** install itself on other machines.
- **Private Marketplace** is self-hosted and auto-updates, but it's **only for GitHub Enterprise customers**. There's no individual plan.
- **Open VSX self-hosting** works but requires running a server and editing `product.json`.

Sources:
- [Install from VSIX](https://code.visualstudio.com/docs/configure/extensions/extension-marketplace#_install-from-a-vsix)
- [Settings Sync](https://code.visualstudio.com/docs/configure/settings-sync)
- [Private Marketplace](https://code.visualstudio.com/docs/enterprise/extensions#_host-a-private-extension-marketplace)
- [Deploying Open VSX](https://github.com/eclipse/openvsx/wiki/Deploying-Open-VSX)

## 3. Git review inside VS Code: build on, don't rebuild

- **`vscode.git` API:** status, add, commit (including signed), branches, checkout, fetch/pull/push, **`merge`/`mergeAbort`**, **`log`**, **`blame`**, `show`, diffs, stash, tags, worktrees, and multi-repo `repositories[]`. `rebase` arrived in 1.112.
- **Built-in views:**
  - Source Control Graph (incoming/outgoing, compare, cherry-pick)
  - Timeline
  - Inline blame, whose hover shows AI co-author trailers
  - 3-way merge editor
  - Rendered Markdown diffs through `workbench.diffEditorAssociations`
  - `git.addAICoAuthor`
- **GitHub Pull Requests extension:** review, comment, approve and merge. Its API for other extensions is narrow (title/description and reviewer-comment providers), so integrate through commands.
- **Azure DevOps:** the official VS Code extension was archived in 2020. A community extension (beta) can't complete PRs. The official **ADO MCP server** has PR tools (vote, threads, reviewers). Gitleaf must provide the ADO review UI.
- **GitLab Workflow:** MR review, comments and approvals.

Sources:
- [git.d.ts](https://github.com/microsoft/vscode/blob/main/extensions/git/src/api/git.d.ts)
- [Source control history](https://code.visualstudio.com/docs/sourcecontrol/history)
- [Merge conflicts](https://code.visualstudio.com/docs/sourcecontrol/merge-conflicts)
- [Markdown in VS Code](https://code.visualstudio.com/docs/languages/markdown)
- [GitHub PRs in VS Code](https://code.visualstudio.com/docs/sourcecontrol/github)
- [GitHub PR extension API](https://github.com/microsoft/vscode-pull-request-github/blob/main/src/api/api.d.ts)
- [Archived Azure Repos extension](https://github.com/Microsoft/vsts-vscode)
- [ADO MCP toolset](https://github.com/microsoft/azure-devops-mcp/blob/main/docs/TOOLSET.md)
- [GitLab Workflow](https://docs.gitlab.com/editor_extensions/visual_studio_code/projects/)

## 4. Agents: one server, one skill set

- **VS Code (for extensions):**
  - `languageModelTools` + `vscode.lm.registerTool`, with `prepareInvocation` for confirmations
  - `mcpServerDefinitionProviders` + `vscode.lm.registerMcpServerDefinitionProvider` (stdio or HTTP)
  - `chatSkills`, `chatAgents`, `chatInstructions` and `chatPromptFiles`
- **VS Code reads Claude-format files:** skills from `.claude/skills`, `.github/skills` and `.agents/skills`; agents from `.claude/agents`. **Agent Plugins** read `.claude-plugin/plugin.json`, plus `extraKnownMarketplaces` and `enabledPlugins` in `.claude/settings.json`.
- **Claude Code plugins** bundle `skills/`, `agents/`, `hooks/` and `.mcp.json`, and are installed from a marketplace repo (`.claude-plugin/marketplace.json`).

Sources:
- [LM tools guide](https://code.visualstudio.com/api/extension-guides/ai/tools)
- [MCP guide](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- [Agent skills in VS Code](https://code.visualstudio.com/docs/copilot/customization/agent-skills)
- [Agent plugins](https://code.visualstudio.com/docs/copilot/customization/agent-plugins)
- [Claude Code plugins reference](https://code.claude.com/docs/en/plugins-reference)
- [Hosting a marketplace](https://code.claude.com/docs/en/plugins/host-marketplace)
- [Plugins for organizations](https://code.claude.com/docs/en/plugins/org)

## 5. Line-level attribution

- **Commit level:** `Co-authored-by` trailers, Claude Code `attribution.*` settings, and VS Code `git.addAICoAuthor`.
- **Line level:** **Agent Trace** (an RFC, v0.1, January 2026) records line ranges with contributor type (human, AI, mixed) and model. **Git AI** stores these in git notes (`refs/notes/ai`), rewrites them after rebases, and supports Claude Code and Copilot. Notes aren't pushed by default.

Sources:
- [Agent Trace](https://agent-trace.dev/)
- [Agent Trace repo](https://github.com/cursor/agent-trace)
- [Thoughtworks Radar: Agent Trace](https://www.thoughtworks.com/radar/platforms/agent-trace)
- [Git AI](https://usegitai.com/docs/get-started/how-git-ai-works)
- [Claude Code settings](https://code.claude.com/docs/en/settings-reference)

## 6. Reuse instead of rebuild (docs tooling)

| Tool | Use it for |
|---|---|
| Built-in Markdown | Preview, **Mermaid**, link validation, link updates on move |
| Foam | Wikilinks, backlinks, graph. Stay compatible |
| markdownlint, Vale (`chrischinchilla.vale-vscode`) | Style and prose linting |
| Draw.io (`hediet.vscode-drawio`) | Diagrams as diff-friendly files |

**Importers to wrap:**
- confluence-markdown-exporter
- Notion's Markdown export and notion-to-md
- Google Docs' native Markdown export
- Microsoft MarkItDown, for Office and SharePoint files
- pandoc

Sources:
- [Foam](https://github.com/foambubble/foam)
- [vale-vscode](https://github.com/ChrisChinchilla/vale-vscode)
- [vscode-drawio](https://github.com/hediet/vscode-drawio)
- [confluence-markdown-exporter](https://github.com/Spenhouet/confluence-markdown-exporter)
- [notion-to-md](https://github.com/souvikinator/notion-to-md)
- [Google Docs Markdown](https://workspaceupdates.googleblog.com/2024/07/import-and-export-markdown-in-google-docs.html)
- [MarkItDown](https://github.com/microsoft/markitdown)

## 7. Naming

"VSDocs" was rejected:

- The [VS Code brand guidelines](https://code.visualstudio.com/brand) forbid "VS Code" in product names and allow "[Name] for Visual Studio Code".
- [Microsoft's trademark guidelines](https://www.microsoft.com/en-us/legal/intellectualproperty/trademarks/usage) forbid combining its marks with other terms.
- Microsoft itself labeled its Visual Studio docs repo "VSDocs".
- A `vsdocs` organization already exists on GitHub.

**Gitleaf** was chosen. Marketplace, Open VSX and trademark-office searches are still pending.
