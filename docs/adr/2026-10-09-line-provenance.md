# Line-level provenance from blame, trailers and Agent Trace notes

- Status: accepted (format details after the ST-FBZGADRT spike)
- Date: 2026-10-09

## Context

Every documentation line must be identifiable: who or which agent wrote it, in which commit or PR, and who approved it. Git blame gives a commit per line. Commit trailers (`Co-authored-by`, Claude Code `attribution` settings, VS Code `git.addAICoAuthor`) mark agent involvement per commit. **Agent Trace** (an RFC, v0.1, January 2026) records line ranges with contributor type (human, AI, mixed) and model, keyed to a commit. Git AI implements it in git notes under `refs/notes/ai`.

## Decision

Provenance is computed in three layers:

1. `git blame` for commit and author per line.
2. Trailers for agent involvement per commit.
3. Agent Trace notes, when present, for line-precise human/AI splits.

Gitleaf **reads** Agent Trace and doesn't invent its own format. Approvals come from the forge, through the merged PR's reviewers.

## Consequences

- Teams that want line-precise AI attribution must push notes (`git push origin refs/notes/*`), because git doesn't push notes by default. Gitleaf documents this and offers a setting to do it.
- Without notes, attribution degrades gracefully to the commit level.
