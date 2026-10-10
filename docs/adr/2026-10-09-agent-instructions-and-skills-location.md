# Agent instructions in AGENTS.md; skills in .claude/skills

- Status: accepted (supersedes the research report's suggestion of `.agents/skills/`)
- Date: 2026-10-09

## Context

Agent instructions and skills should be agent-agnostic. Claude Code reads `AGENTS.md` and `CLAUDE.md`, but its skills load only from `.claude/skills/`. VS Code Copilot discovers skills in `.github/skills/`, `.claude/skills/` and `.agents/skills/`.

## Decision

- `AGENTS.md` is the shared router.
- `CLAUDE.md` imports it (`@AGENTS.md`) and adds Claude-specific notes.
- Skills live in **`.claude/skills/<name>/SKILL.md`**, which serves both Claude Code and Copilot.
- Only add `.agents/skills/` symlinks if a supported agent needs them and its users aren't on Windows.

## Consequences

- One copy of each skill.
- Agents that only read `.agents/skills/` need a symlink or a documented copy step.
