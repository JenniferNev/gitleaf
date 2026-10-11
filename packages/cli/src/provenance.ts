import { relative, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadConfig } from '@gitleaf/adapter-fs-node';
import { GitHubForge } from '@gitleaf/adapter-forge-github';
import { GitCliVcs } from '@gitleaf/adapter-git-cli';
import type { DocProvenance, LineOwner } from '@gitleaf/core';
import { GitProvenance } from '@gitleaf/provenance';

export interface ProvenanceOptions {
  readonly cwd: string;
  readonly file: string;
  readonly env?: Readonly<Record<string, string | undefined>>;
}

const run = promisify(execFile);

/** GITHUB_TOKEN or GH_TOKEN, else `gh auth token` when gh is installed and logged in, else nothing. */
export async function githubToken(
  env: Readonly<Record<string, string | undefined>>,
): Promise<string | undefined> {
  const fromEnv = env.GITHUB_TOKEN ?? env.GH_TOKEN;
  if (fromEnv) return fromEnv;
  if (env.GITLEAF_NO_GH === '1') return undefined;
  try {
    const { stdout } = await run('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 5_000 });
    const token = stdout.trim();
    return token === '' ? undefined : token;
  } catch {
    return undefined;
  }
}

/** Computes provenance for one file in the current repository (the one holding gitleaf.yaml, or the cwd). */
export async function runProvenance(options: ProvenanceOptions): Promise<DocProvenance> {
  const loaded = loadConfig(options.cwd);
  const repoRoot = loaded.repoRoot;
  const abs = resolve(options.cwd, options.file);
  const path = relative(repoRoot, abs).split('\\').join('/');
  if (path.startsWith('..'))
    throw new Error(`${options.file} is outside the repository at ${repoRoot}`);
  const vcs = new GitCliVcs([{ id: '.', rootPath: repoRoot }]);
  const env = options.env ?? process.env;
  let token: Promise<string | undefined> | undefined;
  const forge = new GitHubForge({
    token: () => (token ??= githubToken(env)),
    remoteUrl: (repo) => vcs.remoteUrl(repo),
  });
  return new GitProvenance(vcs, { forge }).provenance('.', path);
}

const KIND_LABEL: Record<LineOwner['kind'], string> = {
  human: 'human',
  agent: 'agent',
  mixed: 'mixed',
  unknown: 'unknown',
};

/** One row per range, then the per-kind share. */
export function formatProvenance(p: DocProvenance): string {
  const rows = p.owners.map((o) => {
    const lines =
      o.startLine === o.endLine
        ? String(o.startLine)
        : `${String(o.startLine)}-${String(o.endLine)}`;
    const who =
      o.agent === undefined ? o.author : o.kind === 'agent' ? o.agent : `${o.author} + ${o.agent}`;
    const date =
      o.commitDate === undefined || o.source === 'uncommitted'
        ? ''
        : o.commitDate.toISOString().slice(0, 10);
    const pr =
      o.pullRequest === undefined
        ? ''
        : `PR #${o.pullRequest}${o.approvedBy && o.approvedBy.length > 0 ? ` approved by ${o.approvedBy.join(', ')}` : ''}`;
    return [
      lines.padEnd(9),
      KIND_LABEL[o.kind].padEnd(8),
      o.source === 'uncommitted' ? '(uncommitted)' : o.commit.slice(0, 7),
      date.padEnd(10),
      who,
      `[${o.source}]`,
      ...(pr === '' ? [] : [pr]),
    ].join('  ');
  });
  const pct = (n: number) => (p.lines === 0 ? '0%' : `${String(Math.round((100 * n) / p.lines))}%`);
  const summary = `${p.path}: ${String(p.lines)} lines, ${pct(p.byKind.human)} human, ${pct(p.byKind.agent)} agent, ${pct(p.byKind.mixed)} mixed, ${pct(p.byKind.unknown)} unknown`;
  return `${[...rows, summary].join('\n')}\n`;
}
