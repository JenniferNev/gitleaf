/**
 * WorkspaceStore over the Node file system. Used by the CLI, CI and the MCP server.
 * Every path is checked to stay inside its repository root.
 */
import { access, glob, readFile, stat, writeFile } from 'node:fs/promises';
import { posix, resolve, sep } from 'node:path';
import type { DocRootSpec, FileStat, Repo, RepoRelativePath, WorkspaceStore } from '@gitleaf/core';

export class NodeWorkspaceStore implements WorkspaceStore {
  readonly #repos: ReadonlyMap<string, Repo>;

  constructor(repos: readonly Repo[]) {
    this.#repos = new Map(repos.map((r) => [r.id, { id: r.id, rootPath: resolve(r.rootPath) }]));
  }

  listRepos(): Promise<readonly Repo[]> {
    return Promise.resolve([...this.#repos.values()]);
  }

  /** Absolute path of a repo-relative path, refusing anything that escapes the root. */
  absolute(repo: Repo['id'], path: RepoRelativePath): string {
    const r = this.#repos.get(repo);
    if (!r) throw new Error(`unknown repository "${repo}"`);
    const abs = resolve(r.rootPath, path);
    if (abs !== r.rootPath && !abs.startsWith(r.rootPath + sep)) {
      throw new Error(`path "${path}" escapes repository "${repo}"`);
    }
    return abs;
  }

  async listFiles(repo: Repo['id'], root: DocRootSpec): Promise<readonly RepoRelativePath[]> {
    const dir = this.absolute(repo, root.path);
    const out: string[] = [];
    for await (const file of glob([...root.include], {
      cwd: dir,
      exclude: [...root.exclude, '**/node_modules/**'],
    })) {
      out.push(posix.join(root.path, file.split(sep).join('/')));
    }
    return out.sort();
  }

  async readText(repo: Repo['id'], path: RepoRelativePath): Promise<string> {
    return readFile(this.absolute(repo, path), 'utf8');
  }

  async writeText(repo: Repo['id'], path: RepoRelativePath, text: string): Promise<void> {
    await writeFile(this.absolute(repo, path), text, 'utf8');
  }

  async exists(repo: Repo['id'], path: RepoRelativePath): Promise<boolean> {
    let abs: string;
    try {
      abs = this.absolute(repo, path);
    } catch {
      return false;
    }
    try {
      await access(abs);
      return true;
    } catch {
      return false;
    }
  }

  async stat(repo: Repo['id'], path: RepoRelativePath): Promise<FileStat | undefined> {
    try {
      const s = await stat(this.absolute(repo, path));
      return { mtime: s.mtime, size: s.size };
    } catch {
      return undefined;
    }
  }
}
