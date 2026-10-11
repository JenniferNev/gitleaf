/**
 * Which commit identities count as agents. Matched against `Co-authored-by`
 * trailers and against commit authors. Teams can extend the list through
 * gitleaf.yaml later; these defaults cover the tools in the research notes.
 */
export interface AgentIdentity {
  readonly name: string;
  readonly email: string;
}

export interface AgentPattern {
  /** Human-readable agent name used when the trailer gives no better one. */
  readonly label: string;
  readonly email?: RegExp;
  readonly name?: RegExp;
}

export const DEFAULT_AGENT_PATTERNS: readonly AgentPattern[] = [
  { label: 'Claude', email: /@anthropic\.com$/i, name: /\bclaude\b/i },
  { label: 'Copilot', email: /^copilot@github\.com$/i, name: /\bcopilot\b/i },
  { label: 'Codex', name: /\bcodex\b/i, email: /@openai\.com$/i },
  { label: 'Cursor', name: /\bcursor\b/i, email: /@cursor\.(com|sh)$/i },
  { label: 'Gemini', name: /\bgemini\b/i },
  { label: 'Bot', name: /\[bot\]$/i, email: /\[bot\]@users\.noreply\.github\.com$/i },
];

/** Parses `Name <email>` as written in a trailer or `git log`. */
export function parseIdentity(value: string): AgentIdentity {
  const m = /^(.*?)\s*<([^>]*)>\s*$/.exec(value.trim());
  if (!m) return { name: value.trim(), email: '' };
  return { name: (m[1] ?? '').trim(), email: (m[2] ?? '').trim() };
}

/** The agent label for an identity, or undefined when it looks human. */
export function agentOf(
  identity: AgentIdentity,
  patterns: readonly AgentPattern[] = DEFAULT_AGENT_PATTERNS,
): string | undefined {
  for (const p of patterns) {
    if (p.email?.test(identity.email) === true || p.name?.test(identity.name) === true) {
      return identity.name !== '' ? identity.name : p.label;
    }
  }
  return undefined;
}
