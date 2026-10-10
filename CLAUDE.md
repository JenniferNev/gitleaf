@AGENTS.md

## Claude Code specifics

- For any task that touches more than one package, a file format, or the appearance contract, start in **plan mode** and wait for approval.
- Before UI work, read `docs/design/README.md`. If it links a Design System artifact, read that artifact by URL (or attach it with `/artifacts`). The token files committed in this repo win if the two disagree.
- Skills live in `.claude/skills/<name>/SKILL.md` for working on this repo. The skills Gitleaf **ships to its users** live in `plugins/claude/skills/`. Don't mix the two.
- Path-scoped rules in `.claude/rules/` load automatically when you touch matching files.
- When you finish an item, list the acceptance criteria you verified and the exact commands you ran, with a one-line summary of each command's output.
- Never commit anything from a private appearance pack: no mascot SVGs, personal icons, logos or signature-shape tokens. `scripts/check-identity.sh` will fail the build if you do.
