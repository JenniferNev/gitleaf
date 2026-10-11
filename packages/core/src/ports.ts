/**
 * Ports: the interfaces adapters implement. Core defines them and never implements them.
 * See the hexagonal-monorepo ADR and docs/architecture.md ("Ports").
 */
import type {
  BlameLine,
  Change,
  DocProvenance,
  DocRootSpec,
  FileStat,
  Repo,
  RepoRelativePath,
  Review,
  SecretRef,
} from './domain.js';

export interface WorkspaceStore {
  listRepos(): Promise<readonly Repo[]>;
  /** Files under a doc root, as repo-relative paths with `/` separators, sorted. */
  listFiles(repo: Repo['id'], root: DocRootSpec): Promise<readonly RepoRelativePath[]>;
  readText(repo: Repo['id'], path: RepoRelativePath): Promise<string>;
  writeText(repo: Repo['id'], path: RepoRelativePath, text: string): Promise<void>;
  exists(repo: Repo['id'], path: RepoRelativePath): Promise<boolean>;
  stat(repo: Repo['id'], path: RepoRelativePath): Promise<FileStat | undefined>;
}

/** Local version control. Implemented by `vscode.git` in the extension and by the git CLI elsewhere. */
export interface VcsPort {
  status(repo: Repo['id']): Promise<readonly Change[]>;
  /** Commit date of the last change to a path, or `undefined` when untracked or not in a repository. */
  lastModified(repo: Repo['id'], path: RepoRelativePath): Promise<Date | undefined>;
  /** `git blame --porcelain` for the working-tree file. */
  blame(repo: Repo['id'], path: RepoRelativePath): Promise<readonly BlameLine[]>;
  /** Parsed trailers of a commit message: key → values, keys lower-cased. */
  commitTrailers(
    repo: Repo['id'],
    commit: string,
  ): Promise<Readonly<Record<string, readonly string[]>>>;
  /** Text of a git note on a commit under `refs/notes/<ref>`, or undefined when there is none. */
  note(repo: Repo['id'], commit: string, ref: string): Promise<string | undefined>;
}

/** Forge operations. Approve and merge are deliberately absent: agents never do those. */
export interface ForgePort {
  listReviews(repo: Repo['id']): Promise<readonly Review[]>;
  openReview(repo: Repo['id'], title: string, body: string): Promise<Review>;
}

export interface ProvenancePort {
  provenance(repo: Repo['id'], path: RepoRelativePath): Promise<DocProvenance>;
}

/** Metadata only. No method on this port ever returns a secret value. */
export interface SecretsPort {
  list(): Promise<readonly SecretRef[]>;
  exists(ref: SecretRef): Promise<boolean>;
}

export interface IdentityPort {
  currentUser(): Promise<{ readonly name: string; readonly email?: string }>;
}

export interface Clock {
  now(): Date;
}

export interface IdGenerator {
  /** Returns 8 random Crockford base32 characters. */
  next(): string;
}
