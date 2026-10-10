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

export interface DocFrontmatter {
  readonly id?: EntityId;
  readonly title?: string;
  readonly owners?: readonly string[];
  readonly status?: DocStatus;
  readonly tags?: readonly string[];
  /** ISO date (YYYY-MM-DD) after which the doc counts as stale. */
  readonly reviewBy?: string;
}

export interface Doc {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  readonly frontmatter: DocFrontmatter;
  /** Body bytes are never modified by Gitleaf. */
  readonly body: string;
}

export type ContributorKind = 'human' | 'agent' | 'mixed' | 'unknown';

/** Who owns a range of lines in a doc. Format details are settled by the ST-FBZGADRT spike. */
export interface LineOwner {
  /** 1-based, inclusive. */
  readonly startLine: number;
  /** 1-based, inclusive. */
  readonly endLine: number;
  readonly kind: ContributorKind;
  readonly author: string;
  /** Model or agent name when `kind` is `agent` or `mixed`. */
  readonly agent?: string;
  readonly commit: string;
  readonly pullRequest?: string;
  readonly approvedBy?: readonly string[];
}

export type ReviewState = 'draft' | 'open' | 'changes-requested' | 'approved' | 'merged';

export interface Review {
  readonly id: string;
  readonly repo: Repo['id'];
  readonly title: string;
  readonly state: ReviewState;
  readonly url?: string;
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
