import type {
  BlameLine,
  CommitReview,
  ContributorKind,
  DocProvenance,
  ForgePort,
  LineOwner,
  ProvenancePort,
  Repo,
  RepoRelativePath,
  VcsPort,
} from '@gitleaf/core';
import { agentOf, parseIdentity, type AgentPattern, DEFAULT_AGENT_PATTERNS } from './agents.js';
import { lookupTrace, parseTraceNote, type TraceRecord } from './agent-trace.js';

export const UNCOMMITTED_COMMIT = '0'.repeat(40);
export const AGENT_TRACE_NOTES_REF = 'ai';

export interface CommitClassification {
  readonly kind: ContributorKind;
  readonly agent?: string;
  readonly source: 'author' | 'trailer' | 'blame';
}

/**
 * Layer 2: what a commit's author and trailers say. An agent author makes the
 * whole commit `agent`; an agent co-author makes it `mixed` (a human committed
 * with agent help); otherwise `human`.
 */
export function classifyCommit(
  author: { name: string; email: string },
  trailers: Readonly<Record<string, readonly string[]>>,
  patterns: readonly AgentPattern[] = DEFAULT_AGENT_PATTERNS,
): CommitClassification {
  const authorAgent = agentOf(author, patterns);
  if (authorAgent !== undefined) return { kind: 'agent', agent: authorAgent, source: 'author' };
  const coAuthors = trailers['co-authored-by'] ?? [];
  for (const value of coAuthors) {
    const agent = agentOf(parseIdentity(value), patterns);
    if (agent !== undefined) return { kind: 'mixed', agent, source: 'trailer' };
  }
  return { kind: 'human', source: 'blame' };
}

interface PerLine extends Omit<LineOwner, 'startLine' | 'endLine'> {
  readonly line: number;
}

/** Merges consecutive lines with the same owner into ranges. */
export function coalesce(lines: readonly PerLine[]): readonly LineOwner[] {
  const out: LineOwner[] = [];
  for (const l of lines) {
    const last = out[out.length - 1];
    const { line, ...rest } = l;
    if (last?.endLine === line - 1 && sameOwner(last, rest)) {
      out[out.length - 1] = { ...last, endLine: line };
    } else {
      out.push({ startLine: line, endLine: line, ...rest });
    }
  }
  return out;
}

function sameOwner(a: LineOwner, b: Omit<LineOwner, 'startLine' | 'endLine'>): boolean {
  return (
    a.kind === b.kind &&
    a.commit === b.commit &&
    a.agent === b.agent &&
    a.author === b.author &&
    a.source === b.source &&
    a.pullRequest === b.pullRequest
  );
}

export interface GitProvenanceOptions {
  readonly patterns?: readonly AgentPattern[];
  readonly notesRef?: string;
  /** When given, each commit is enriched with its pull request and approvers. Failures degrade silently. */
  readonly forge?: ForgePort;
}

/** ProvenancePort over any VcsPort: blame, then trailers, then Agent Trace notes. */
export class GitProvenance implements ProvenancePort {
  readonly #vcs: VcsPort;
  readonly #patterns: readonly AgentPattern[];
  readonly #notesRef: string;
  readonly #forge: ForgePort | undefined;

  constructor(vcs: VcsPort, options: GitProvenanceOptions = {}) {
    this.#vcs = vcs;
    this.#patterns = options.patterns ?? DEFAULT_AGENT_PATTERNS;
    this.#notesRef = options.notesRef ?? AGENT_TRACE_NOTES_REF;
    this.#forge = options.forge;
  }

  async #review(repo: Repo['id'], commit: string): Promise<CommitReview | undefined> {
    if (!this.#forge) return undefined;
    try {
      return await this.#forge.reviewForCommit(repo, commit);
    } catch {
      return undefined;
    }
  }

  async provenance(repo: Repo['id'], path: RepoRelativePath): Promise<DocProvenance> {
    const blame = await this.#vcs.blame(repo, path);
    const commits = new Map<
      string,
      {
        classification: CommitClassification;
        traces: readonly TraceRecord[];
        review: CommitReview | undefined;
      }
    >();
    const perLine: PerLine[] = [];
    for (const b of blame) {
      if (b.commit === UNCOMMITTED_COMMIT) {
        perLine.push({
          line: b.line,
          kind: 'unknown',
          author: 'uncommitted',
          commit: b.commit,
          source: 'uncommitted',
        });
        continue;
      }
      let info = commits.get(b.commit);
      if (!info) {
        const [trailers, note, review] = await Promise.all([
          this.#vcs.commitTrailers(repo, b.commit),
          this.#vcs.note(repo, b.commit, this.#notesRef),
          this.#review(repo, b.commit),
        ]);
        info = {
          classification: classifyCommit(
            { name: b.author, email: b.authorEmail },
            trailers,
            this.#patterns,
          ),
          traces: note === undefined ? [] : parseTraceNote(note),
          review,
        };
        commits.set(b.commit, info);
      }
      perLine.push(ownerOf(b, info.classification, info.traces, path, info.review));
    }
    const owners = coalesce(perLine);
    const byKind: Record<ContributorKind, number> = { human: 0, agent: 0, mixed: 0, unknown: 0 };
    for (const l of perLine) byKind[l.kind] += 1;
    return { repo, path, owners, lines: perLine.length, byKind };
  }
}

function ownerOf(
  b: BlameLine,
  c: CommitClassification,
  traces: readonly TraceRecord[],
  path: string,
  review: CommitReview | undefined,
): PerLine {
  const base = {
    line: b.line,
    author: b.author,
    authorEmail: b.authorEmail,
    commit: b.commit,
    commitDate: b.authorTime,
    ...(review === undefined
      ? {}
      : { pullRequest: review.review.id, approvedBy: review.approvedBy }),
  };
  // Layer 3 wins when a trace covers the line as it was in that commit.
  const hit = lookupTrace(traces, path, b.originalLine);
  if (hit !== undefined) {
    return {
      ...base,
      kind: hit.kind,
      source: 'agent-trace',
      ...(hit.agent === undefined ? {} : { agent: hit.agent }),
    };
  }
  return {
    ...base,
    kind: c.kind,
    source: c.source,
    ...(c.agent === undefined ? {} : { agent: c.agent }),
  };
}
