/**
 * VcsPort over the git command line. Used by the CLI, CI and the MCP server;
 * the extension uses vscode.git where the API suffices and this adapter's
 * parsers for porcelain blame.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { BlameLine, Change, Repo, RepoRelativePath, VcsPort } from '@gitleaf/core';

const run = promisify(execFile);

export interface GitCliOptions {
  /** Path of the git executable. Defaults to `git` on PATH; the extension passes the one vscode.git uses. */
  readonly gitPath?: string;
}

export class GitCliVcs implements VcsPort {
  readonly #roots: ReadonlyMap<string, string>;
  readonly #gitPath: string;

  constructor(repos: readonly Repo[], options: GitCliOptions = {}) {
    this.#roots = new Map(repos.map((r) => [r.id, r.rootPath]));
    this.#gitPath = options.gitPath ?? 'git';
  }

  async #git(repo: Repo['id'], args: readonly string[]): Promise<string> {
    const root = this.#roots.get(repo);
    if (root === undefined) throw new Error(`unknown repository "${repo}"`);
    const { stdout } = await run(this.#gitPath, ['-C', root, ...args], {
      encoding: 'utf8',
      timeout: 20_000,
      maxBuffer: 64 * 1024 * 1024,
    });
    return stdout;
  }

  async lastModified(repo: Repo['id'], path: RepoRelativePath): Promise<Date | undefined> {
    try {
      const iso = (await this.#git(repo, ['log', '-1', '--format=%cI', '--', path])).trim();
      if (iso === '') return undefined;
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  async blame(repo: Repo['id'], path: RepoRelativePath): Promise<readonly BlameLine[]> {
    const out = await this.#git(repo, ['blame', '--porcelain', '--', path]);
    return parsePorcelainBlame(out);
  }

  async commitTrailers(
    repo: Repo['id'],
    commit: string,
  ): Promise<Readonly<Record<string, readonly string[]>>> {
    const out = await this.#git(repo, ['show', '-s', '--format=%(trailers:only,unfold)', commit]);
    return parseTrailers(out);
  }

  async note(repo: Repo['id'], commit: string, ref: string): Promise<string | undefined> {
    try {
      return await this.#git(repo, ['notes', `--ref=${ref}`, 'show', commit]);
    } catch {
      return undefined;
    }
  }

  async remoteUrl(repo: Repo['id'], name = 'origin'): Promise<string | undefined> {
    try {
      const url = (await this.#git(repo, ['remote', 'get-url', name])).trim();
      return url === '' ? undefined : url;
    } catch {
      return undefined;
    }
  }

  async status(repo: Repo['id']): Promise<readonly Change[]> {
    const out = await this.#git(repo, ['status', '--porcelain=v1', '-z']);
    const changes: Change[] = [];
    for (const entry of out.split('\0')) {
      if (entry.length < 4) continue;
      const code = entry.slice(0, 2);
      const path = entry.slice(3);
      const status = code.includes('D')
        ? 'deleted'
        : code.includes('R')
          ? 'renamed'
          : code.includes('A') || code === '??'
            ? 'added'
            : 'modified';
      changes.push({ repo, path, status });
    }
    return changes;
  }
}

const UNCOMMITTED = '0'.repeat(40);

/** Parses `git blame --porcelain` output. Header fields repeat only on a commit's first occurrence. */
export function parsePorcelainBlame(text: string): readonly BlameLine[] {
  const lines: BlameLine[] = [];
  const commits = new Map<
    string,
    { author: string; authorEmail: string; authorTime: Date; summary: string }
  >();
  const rows = text.split('\n');
  let i = 0;
  while (i < rows.length) {
    const head = rows[i] ?? '';
    const m = /^([0-9a-f]{40}) (\d+) (\d+)(?: (\d+))?$/.exec(head);
    if (!m) {
      i++;
      continue;
    }
    const commit = m[1] ?? UNCOMMITTED;
    const originalLine = Number(m[2]);
    const line = Number(m[3]);
    i++;
    const info = commits.get(commit) ?? {
      author: '',
      authorEmail: '',
      authorTime: new Date(0),
      summary: '',
    };
    while (i < rows.length && !(rows[i] ?? '').startsWith('\t')) {
      const row = rows[i] ?? '';
      const sp = row.indexOf(' ');
      const key = sp === -1 ? row : row.slice(0, sp);
      const value = sp === -1 ? '' : row.slice(sp + 1);
      if (key === 'author') info.author = value;
      else if (key === 'author-mail') info.authorEmail = value.replace(/^<|>$/g, '');
      else if (key === 'author-time') info.authorTime = new Date(Number(value) * 1000);
      else if (key === 'summary') info.summary = value;
      i++;
    }
    commits.set(commit, info);
    i++; // the content line
    lines.push({ line, originalLine, commit, ...info });
  }
  return lines.sort((a, b) => a.line - b.line);
}

/** Parses `Key: value` trailer lines into a map with lower-cased keys. */
export function parseTrailers(text: string): Readonly<Record<string, readonly string[]>> {
  const out: Record<string, string[]> = {};
  for (const raw of text.split('\n')) {
    const m = /^([A-Za-z][A-Za-z0-9-]*)\s*:\s*(.+)$/.exec(raw.trim());
    if (!m) continue;
    const key = (m[1] ?? '').toLowerCase();
    (out[key] ??= []).push((m[2] ?? '').trim());
  }
  return out;
}

export { UNCOMMITTED };
