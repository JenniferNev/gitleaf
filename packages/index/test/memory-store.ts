import type { DocRootSpec, FileStat, Repo, RepoRelativePath, WorkspaceStore } from '@gitleaf/core';

/** In-memory WorkspaceStore for tests: `files[repo][path] = text`. */
export class MemoryStore implements WorkspaceStore {
  constructor(readonly files: Record<string, Record<string, string>>) {}

  listRepos(): Promise<readonly Repo[]> {
    return Promise.resolve(Object.keys(this.files).map((id) => ({ id, rootPath: `/${id}` })));
  }

  listFiles(repo: string, root: DocRootSpec): Promise<readonly RepoRelativePath[]> {
    const all = Object.keys(this.files[repo] ?? {});
    const prefix = root.path === '.' ? '' : `${root.path}/`;
    const md = all.filter((p) => p.startsWith(prefix) && p.endsWith('.md'));
    const excluded = (p: string) =>
      root.exclude.some((e) => p.includes(e.replaceAll('**/', '').replaceAll('/**', '')));
    return Promise.resolve(md.filter((p) => !excluded(p)).sort());
  }

  readText(repo: string, path: RepoRelativePath): Promise<string> {
    const text = this.files[repo]?.[path];
    return text === undefined
      ? Promise.reject(new Error(`ENOENT ${repo}:${path}`))
      : Promise.resolve(text);
  }

  writeText(repo: string, path: RepoRelativePath, text: string): Promise<void> {
    (this.files[repo] ??= {})[path] = text;
    return Promise.resolve();
  }

  exists(repo: string, path: RepoRelativePath): Promise<boolean> {
    return Promise.resolve(this.files[repo]?.[path] !== undefined);
  }

  stat(repo: string, path: RepoRelativePath): Promise<FileStat | undefined> {
    const text = this.files[repo]?.[path];
    return Promise.resolve(
      text === undefined ? undefined : { mtime: new Date(0), size: text.length },
    );
  }
}
