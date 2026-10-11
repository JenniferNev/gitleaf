# Line-level provenance from blame, trailers and Agent Trace notes

- Status: accepted (spike results below, 2026-10-11)
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

## Spike results (ST-FBZGADRT, 2026-10-11)

### What `vscode.git` `blame()` returns

`Repository.blame(path): Promise<string>` runs `git blame -- <path>` with **no** `--porcelain` flag and returns the trimmed stdout ([git.ts](https://github.com/microsoft/vscode/blob/main/extensions/git/src/git.ts), `async blame`). That is the default human format: short SHA, author name, date, line number and content. It has no author email and no **original line number**, and the richer `blame2()` (`BlameInformation[]`) is not part of the public API.

Consequences:

- Layer 1 (commit and author per line) can use the API output in the extension.
- Layer 3 needs the original line number to look up Agent Trace ranges, so the extension runs `git blame --porcelain` itself through the git binary the API exposes (`API.git.path`). The parser lives in `@gitleaf/adapter-git-cli` (`parsePorcelainBlame`) and is shared by the CLI and the extension.

### Which trailers agents write today (real samples)

| Tool | Trailer | When |
|---|---|---|
| Claude Code | `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>` (this repository's own commits) | Default. Configurable or disabled through the `attribution.commit` setting. |
| VS Code (Copilot) | `Co-authored-by: Copilot <copilot@github.com>` ([repository.ts](https://github.com/microsoft/vscode/blob/main/extensions/git/src/repository.ts), `AI_CO_AUTHOR_TRAILER`) | Only when `git.addAICoAuthor` is `chatAndAgent` or `all` (default `off`) and the `_aiEdits.hasAiContributions` check says the staged files had AI edits. |
| Bots | commit *author* such as `github-actions[bot] <…@users.noreply.github.com>` | Author identity, not a trailer. |

Trailer keys are matched case-insensitively (`Co-Authored-By` and `Co-authored-by` both occur). Agent identities are recognized by email domain or name (`@anthropic.com`, `copilot@github.com`, `[bot]`, and the names Claude, Copilot, Codex, Cursor, Gemini); the list is `DEFAULT_AGENT_PATTERNS` in `@gitleaf/provenance`.

### Agent Trace notes

- The spec ([agent-trace.dev](https://agent-trace.dev), v0.1.0, RFC) defines a JSON **trace record**: `version`, `id`, `timestamp`, `vcs { type, revision }`, `tool { name, version }`, `files[] { path, conversations[] { url, contributor { type: human|ai|mixed|unknown, model_id }, ranges[] { start_line, end_line, contributor? } } }`. Line numbers are 1-based and refer to the file **at the recorded revision**; ownership of a current line is found by blame (which commit) plus the original line number (which range). That is exactly what the porcelain parser provides.
- Git AI stores notes under `refs/notes/ai`, addressed by commit, and rewrites them after rebase, squash, cherry-pick and amend. Its notes-backend spec treats note content as an opaque UTF-8 string; the documented content is a human-readable summary (`src/auth.ts session_1 1-8,10-21`) followed by JSON. Gitleaf therefore extracts **every JSON object in the note that validates as a trace record** and ignores the rest (`parseTraceNote`).
- Notes are not pushed by default. `git push origin refs/notes/*` (or `remote.<name>.push = +refs/notes/*:refs/notes/*`) is required for CI and teammates to see line-precise attribution.

### `LineOwner` model (in `@gitleaf/core`)

```ts
interface LineOwner {
  startLine: number; endLine: number;          // 1-based, inclusive
  kind: 'human' | 'agent' | 'mixed' | 'unknown';
  author: string; authorEmail?: string;        // from blame
  agent?: string;                              // model id (Agent Trace) or agent name (trailer/author)
  commit: string; commitDate?: Date;
  source: 'agent-trace' | 'trailer' | 'author' | 'blame' | 'uncommitted';
  pullRequest?: string; approvedBy?: string[];  // from the forge, later
}
```

Resolution per line: an Agent Trace range covering the line's original number wins; otherwise the commit's classification applies (agent author → `agent`, agent co-author → `mixed`, else `human`); uncommitted lines are `unknown`. Adjacent lines with the same owner coalesce into one range. `DocProvenance` adds the line count per kind.

### Prototype

`gitleaf provenance docs/x.md` prints one row per range and a summary. Sample output for the end-to-end test fixture (three commits and one uncommitted line):

```
1          human     3f1c2a9  2026-10-11  Sam Lee  [blame]
2          mixed     8b7e0d4  2026-10-11  Sam Lee + Claude Fable 5.1  [trailer]
3          human     3f1c2a9  2026-10-11  Sam Lee  [blame]
4-5        agent     8b7e0d4  2026-10-11  anthropic/claude-fable-5-1  [agent-trace]
6          agent     c0ffee1  2026-10-11  github-actions[bot]  [author]
7          unknown   (uncommitted)              uncommitted  [uncommitted]
docs/x.md: 7 lines, 29% human, 43% agent, 14% mixed, 14% unknown
```

### Open points

- Approvals (`approvedBy`) and `pullRequest` need the forge: GitHub's PR API (through the GitHub Pull Requests extension or REST) and Azure DevOps. They stay undefined until the review stories.
- `model_id` follows the models.dev convention (`provider/model`); trailer-based attribution only knows a display name.
