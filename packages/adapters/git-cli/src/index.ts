/**
 * VcsPort over the git command line. Used by the CLI and CI; the extension uses vscode.git.
 * Only what the validate command needs exists yet. Blame, status and trailers arrive with ST-FBZGADRT.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { Change, LineOwner, Repo, RepoRelativePath, VcsPort } from '@gitleaf/core';

const run = promisify(execFile);

export class GitCliVcs implements VcsPort {
  readonly #roots: ReadonlyMap<string, string>;

  constructor(repos: readonly Repo[]) {
    this.#roots = new Map(repos.map((r) => [r.id, r.rootPath]));
  }

  async lastModified(repo: Repo['id'], path: RepoRelativePath): Promise<Date | undefined> {
    const root = this.#roots.get(repo);
    if (root === undefined) throw new Error(`unknown repository "${repo}"`);
    try {
      const { stdout } = await run('git', ['-C', root, 'log', '-1', '--format=%cI', '--', path], {
        encoding: 'utf8',
        timeout: 10_000,
      });
      const iso = stdout.trim();
      if (iso === '') return undefined;
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  status(_repo: Repo['id']): Promise<readonly Change[]> {
    return Promise.reject(new Error('GitCliVcs.status is not implemented yet (ST-FBZGADRT)'));
  }

  blame(_repo: Repo['id'], _path: RepoRelativePath): Promise<readonly LineOwner[]> {
    return Promise.reject(new Error('GitCliVcs.blame is not implemented yet (ST-FBZGADRT)'));
  }

  commitTrailers(
    _repo: Repo['id'],
    _commit: string,
  ): Promise<Readonly<Record<string, readonly string[]>>> {
    return Promise.reject(
      new Error('GitCliVcs.commitTrailers is not implemented yet (ST-FBZGADRT)'),
    );
  }
}
