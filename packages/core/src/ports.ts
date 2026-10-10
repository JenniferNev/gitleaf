/**
 * Ports: the interfaces adapters implement. Core defines them and never implements them.
 * See the hexagonal-monorepo ADR and docs/architecture.md ("Ports").
 */
import type {
  Change,
  Doc,
  LineOwner,
  Repo,
  RepoRelativePath,
  Review,
  SecretRef,
} from './domain.js';

export interface WorkspaceStore {
  listRepos(): Promise<readonly Repo[]>;
  listDocs(repo: Repo['id']): Promise<readonly RepoRelativePath[]>;
  readText(repo: Repo['id'], path: RepoRelativePath): Promise<string>;
  writeText(repo: Repo['id'], path: RepoRelativePath, text: string): Promise<void>;
}

/** Local version control. Implemented by `vscode.git` in the extension and by the git CLI elsewhere. */
export interface VcsPort {
  status(repo: Repo['id']): Promise<readonly Change[]>;
  blame(repo: Repo['id'], path: RepoRelativePath): Promise<readonly LineOwner[]>;
  commitTrailers(
    repo: Repo['id'],
    commit: string,
  ): Promise<Readonly<Record<string, readonly string[]>>>;
}

/** Forge operations. Approve and merge are deliberately absent: agents never do those. */
export interface ForgePort {
  listReviews(repo: Repo['id']): Promise<readonly Review[]>;
  openReview(repo: Repo['id'], title: string, body: string): Promise<Review>;
}

export interface ProvenancePort {
  lineOwners(doc: Doc): Promise<readonly LineOwner[]>;
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
