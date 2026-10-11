import { execFileSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitCliVcs } from './index.js';

let root: string;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'gitleaf-git-'));
  const git = (...args: string[]) => execFileSync('git', ['-C', root, ...args], { stdio: 'pipe' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  await writeFile(join(root, 'tracked.md'), '# tracked\n');
  git('add', 'tracked.md');
  git('-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'add', '--date', '2024-02-03T04:05:06Z');
  await writeFile(join(root, 'untracked.md'), '# untracked\n');
});

describe('GitCliVcs', () => {
  it('returns the commit date of a tracked file', async () => {
    const vcs = new GitCliVcs([{ id: '.', rootPath: root }]);
    const date = await vcs.lastModified('.', 'tracked.md');
    expect(date).toBeInstanceOf(Date);
    expect(date?.getTime()).toBeGreaterThan(0);
  });

  it('returns undefined for untracked files and non-repositories', async () => {
    const vcs = new GitCliVcs([
      { id: '.', rootPath: root },
      { id: 'tmp', rootPath: tmpdir() },
    ]);
    expect(await vcs.lastModified('.', 'untracked.md')).toBeUndefined();
    expect(await vcs.lastModified('tmp', 'whatever.md')).toBeUndefined();
  });

  it('reports working-tree status', async () => {
    const vcs = new GitCliVcs([{ id: '.', rootPath: root }]);
    expect(await vcs.status('.')).toEqual([{ repo: '.', path: 'untracked.md', status: 'added' }]);
  });
});
