import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { NodeWorkspaceStore } from './index.js';

let root: string;
let store: NodeWorkspaceStore;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'gitleaf-fs-'));
  await mkdir(join(root, 'docs', 'sub', 'legacy'), { recursive: true });
  await writeFile(join(root, 'docs', 'a.md'), '# a\n');
  await writeFile(join(root, 'docs', 'sub', 'b.md'), '# b\n');
  await writeFile(join(root, 'docs', 'sub', 'legacy', 'old.md'), '# old\n');
  await writeFile(join(root, 'docs', 'c.txt'), 'not a doc\n');
  store = new NodeWorkspaceStore([{ id: '.', rootPath: root }]);
});

describe('NodeWorkspaceStore', () => {
  it('lists files under a root with include and exclude globs, sorted, with / separators', async () => {
    const files = await store.listFiles('.', {
      path: 'docs',
      include: ['**/*.md'],
      exclude: ['**/legacy/**'],
    });
    expect(files).toEqual(['docs/a.md', 'docs/sub/b.md']);
  });

  it('reads, stats and checks existence', async () => {
    expect(await store.readText('.', 'docs/a.md')).toBe('# a\n');
    expect(await store.exists('.', 'docs/a.md')).toBe(true);
    expect(await store.exists('.', 'docs/missing.md')).toBe(false);
    expect((await store.stat('.', 'docs/a.md'))?.size).toBe(4);
    expect(await store.stat('.', 'nope')).toBeUndefined();
  });

  it('refuses paths that escape the repository', async () => {
    expect(() => store.absolute('.', '../etc/passwd')).toThrow(/escapes/);
    expect(await store.exists('.', '../etc/passwd')).toBe(false);
    await expect(store.readText('.', '/etc/hostname')).rejects.toThrow(/escapes/);
  });

  it('rejects unknown repositories', () => {
    expect(() => store.absolute('other', 'x')).toThrow(/unknown repository/);
  });
});
