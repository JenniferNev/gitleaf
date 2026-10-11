/**
 * Domain types shared by every Gitleaf module. See docs/architecture.md.
 * This file must stay free of I/O and of any dependency.
 */

/** A path relative to a repository root, always with `/` separators. */
export type RepoRelativePath = string;

/** `<TYPE>-<8 Crockford base32 chars>`, for example `ST-37MPP7WD`. See the random-ids ADR. */
export type EntityId = string;

export type DocStatus = 'draft' | 'in-review' | 'published' | 'archived';

export interface Repo {
  /** Stable identifier for the repository inside a workspace (its root path or a configured alias). */
  readonly id: string;
  readonly rootPath: string;
}

/** Mirrors `gitleaf/doc@1` in packages/schema. Keys use the on-disk spelling. */
export interface DocFrontmatter {
  readonly schema?: 'gitleaf/doc@1';
  readonly id?: EntityId;
  readonly title?: string;
  readonly owners?: readonly string[];
  readonly status?: DocStatus;
  readonly tags?: readonly string[];
  /** ISO date (YYYY-MM-DD) after which the doc counts as stale. Snake case: it mirrors the file format. */
  readonly review_by?: string;
}

export interface Doc {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  readonly frontmatter: DocFrontmatter;
  /** Body bytes are never modified by Gitleaf. */
  readonly body: string;
}

export type ContributorKind = 'human' | 'agent' | 'mixed' | 'unknown';

/** One line of `git blame --porcelain`: which commit last touched it and where it was then. */
export interface BlameLine {
  /** 1-based line in the current file. */
  readonly line: number;
  /** 1-based line in the file as of `commit`. Needed to look up Agent Trace ranges. */
  readonly originalLine: number;
  /** 40-char SHA, or all zeros for uncommitted lines. */
  readonly commit: string;
  readonly author: string;
  readonly authorEmail: string;
  readonly authorTime: Date;
  readonly summary: string;
}

/** Where a LineOwner's classification came from, strongest first. */
export type ProvenanceSource = 'agent-trace' | 'trailer' | 'author' | 'blame' | 'uncommitted';

/**
 * Who owns a range of lines in a doc. Computed from three layers:
 * 1. `git blame` for commit and author per line;
 * 2. commit trailers (`Co-authored-by` with an agent identity) for agent involvement per commit;
 * 3. Agent Trace records in `refs/notes/ai` for line-precise human/AI splits.
 * Approvals and the pull request come from the forge, when known.
 */
export interface LineOwner {
  /** 1-based, inclusive. */
  readonly startLine: number;
  /** 1-based, inclusive. */
  readonly endLine: number;
  readonly kind: ContributorKind;
  readonly author: string;
  readonly authorEmail?: string;
  /** Model or agent name when `kind` is `agent` or `mixed`: `anthropic/claude-opus-4-5`, `Copilot`. */
  readonly agent?: string;
  readonly commit: string;
  readonly commitDate?: Date;
  readonly source: ProvenanceSource;
  readonly pullRequest?: string;
  readonly approvedBy?: readonly string[];
}

/** Per-doc provenance: owners plus a line count per contributor kind. */
export interface DocProvenance {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  readonly owners: readonly LineOwner[];
  readonly lines: number;
  readonly byKind: Readonly<Record<ContributorKind, number>>;
}

export type ReviewState = 'draft' | 'open' | 'changes-requested' | 'approved' | 'merged';

export interface Review {
  /** Forge-local identifier: the pull request number on GitHub. */
  readonly id: string;
  readonly repo: Repo['id'];
  readonly title: string;
  readonly state: ReviewState;
  readonly url?: string;
  readonly author?: string;
}

/** A merged (or open) review that contains a commit, and who approved it. */
export interface CommitReview {
  readonly review: Review;
  readonly approvedBy: readonly string[];
}

export interface Change {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  readonly status: 'added' | 'modified' | 'deleted' | 'renamed';
}

/** A `secret://…` reference. Gitleaf never holds secret values. */
export interface SecretRef {
  readonly uri: `secret://${string}`;
  readonly description?: string;
}

export type Severity = 'error' | 'warning';

/** One finding from validation or docs-health, addressed to a file and line. */
export interface Diagnostic {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  /** 1-based. Line 1 when the finding concerns the whole file. */
  readonly line: number;
  /** 1-based, when known. */
  readonly column?: number;
  readonly severity: Severity;
  /** Stable rule id, `links/broken`. */
  readonly rule: string;
  readonly message: string;
}

/** A folder of docs inside a repository, with glob patterns relative to that folder. */
export interface DocRootSpec {
  readonly path: RepoRelativePath;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
}

export interface FileStat {
  readonly mtime: Date;
  readonly size: number;
}
