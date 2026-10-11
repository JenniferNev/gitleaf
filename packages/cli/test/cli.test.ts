import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { main, VERSION, type ValidateReport } from '../src/index.js';

function io(cwd: string, env: Record<string, string | undefined> = {}, isTTY = false) {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: {
      out: { write: (s: string) => out.push(s) },
      err: { write: (s: string) => err.push(s) },
      cwd,
      env,
      isTTY,
    },
    out: () => out.join(''),
    err: () => err.join(''),
  };
}

async function write(root: string, files: Record<string, string>): Promise<void> {
  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), text);
  }
}

let ws: string;
let repoA: string;
let repoB: string;

beforeAll(async () => {
  ws = await mkdtemp(join(tmpdir(), 'gitleaf-cli-'));
  repoA = join(ws, 'repo-a');
  repoB = join(ws, 'repo-b');
  await write(repoA, {
    'gitleaf.yaml': [
      'schema: gitleaf/config@1',
      'roots:',
      '  - path: docs',
      '  - path: handbook',
      '    repo: repo-b',
      'rules:',
      '  owners: required',
      '  links: error',
      '',
    ].join('\n'),
    'docs/good.md':
      '---\ntitle: Good\nowners: [sam]\n---\nSee [[Onboarding]] and [bad](nope.md).\n',
    'docs/no-owner.md': '---\ntitle: Lonely\n---\n',
    'docs/sub/deep.md': '---\nowners: [li]\nx-deploy:\n  token: plain-value\n---\n',
  });
  await write(repoB, {
    'handbook/onboarding.md': '---\nowners: [maria]\n---\n[up](../missing.md)\n',
  });
});

describe('gitleaf cli', () => {
  it('prints the version and usage', async () => {
    const t = io(repoA);
    expect(await main(['--version'], t.io)).toBe(0);
    expect(t.out()).toBe(`${VERSION}\n`);
    expect(await main([], io(repoA).io)).toBe(2);
    expect(await main(['frobnicate'], io(repoA).io)).toBe(2);
    expect(await main(['validate', '--nope'], io(repoA).io)).toBe(2);
  });

  it('validates across two repositories with file:line output and exit 1', async () => {
    const t = io(repoA);
    expect(await main(['validate'], t.io)).toBe(1);
    const lines = t.out().trimEnd().split('\n');
    expect(lines).toEqual([
      'docs/good.md:5:30: error: broken link "nope.md" (resolved to docs/nope.md) [links/broken]',
      'docs/no-owner.md:1: error: owners are required by gitleaf.yaml [owners/missing]',
      'docs/sub/deep.md:3: error: x-deploy.token: a secret value where a secret:// reference is expected [secrets/value]',
      `${join('..', 'repo-b', 'handbook', 'onboarding.md')}:4:6: error: broken link "../missing.md" (resolved to missing.md) [links/broken]`,
      'gitleaf validate: 4 files, 4 errors, 0 warnings',
    ]);
    expect(t.out()).not.toContain('\u001b[');
  });

  it('works from a subfolder and limits to given paths', async () => {
    const t = io(join(repoA, 'docs', 'sub'));
    expect(await main(['validate', '.'], t.io)).toBe(1);
    expect(t.out().trimEnd().split('\n')).toEqual([
      'deep.md:3: error: x-deploy.token: a secret value where a secret:// reference is expected [secrets/value]',
      'gitleaf validate: 1 files, 1 errors, 0 warnings',
    ]);
  });

  it('emits JSON with absolute files for CI', async () => {
    const t = io(repoA);
    expect(await main(['validate', '--json'], t.io)).toBe(1);
    const report = JSON.parse(t.out()) as ValidateReport;
    expect(report.files).toBe(4);
    expect(report.errors).toBe(4);
    expect(report.diagnostics[0]?.file).toBe(join(repoA, 'docs', 'good.md'));
    expect(report.diagnostics.map((d) => d.rule)).toEqual([
      'links/broken',
      'owners/missing',
      'secrets/value',
      'links/broken',
    ]);
  });

  it('colors only on a TTY without NO_COLOR, and prints GitHub annotations under Actions', async () => {
    const tty = io(repoA, {}, true);
    await main(['validate'], tty.io);
    expect(tty.out()).toContain('\u001b[31merror\u001b[0m');
    const noColor = io(repoA, { NO_COLOR: '1' }, true);
    await main(['validate'], noColor.io);
    expect(noColor.out()).not.toContain('\u001b[');
    const flag = io(repoA, {}, true);
    await main(['validate', '--no-color'], flag.io);
    expect(flag.out()).not.toContain('\u001b[');
    const gha = io(repoA, { GITHUB_ACTIONS: 'true' });
    await main(['validate'], gha.io);
    expect(gha.out()).toContain(
      '::error file=docs/no-owner.md,line=1,title=owners/missing::owners are required by gitleaf.yaml',
    );
  });

  it('--strict turns warnings into failure', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gitleaf-strict-'));
    await write(root, {
      'gitleaf.yaml': 'schema: gitleaf/config@1\nroots: [{ path: docs }]\n',
      'docs/w.md': '---\r\ntitle: W\r\n---\r\n',
    });
    expect(await main(['validate'], io(root).io)).toBe(0);
    expect(await main(['validate', '--strict'], io(root).io)).toBe(1);
  });

  it('falls back to docs/ without a config and fails clearly without either', async () => {
    const plain = await mkdtemp(join(tmpdir(), 'gitleaf-plain-'));
    await write(plain, { 'docs/a.md': '# fine\n' });
    const t = io(plain);
    expect(await main(['validate'], t.io)).toBe(0);
    expect(t.out()).toContain('1 files, 0 errors');
    const empty = await mkdtemp(join(tmpdir(), 'gitleaf-empty-'));
    const e = io(empty);
    expect(await main(['validate'], e.io)).toBe(2);
    expect(e.out()).toContain('[config/missing]');
  });

  it('reports an invalid gitleaf.yaml with its line and exits 2', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gitleaf-badcfg-'));
    await write(root, {
      'gitleaf.yaml':
        'schema: gitleaf/config@1\nroots: [{ path: docs }]\nforge:\n  kind: github\n  url: https://x\n  token: ghp_value\n',
    });
    const t = io(root);
    expect(await main(['validate'], t.io)).toBe(2);
    expect(t.out()).toContain('gitleaf.yaml:3: error: forge.token must match pattern');
    const missingRepo = await mkdtemp(join(tmpdir(), 'gitleaf-norepo-'));
    await write(missingRepo, {
      'gitleaf.yaml': 'schema: gitleaf/config@1\nroots: [{ path: docs, repo: nowhere }]\n',
    });
    const m = io(missingRepo);
    expect(await main(['validate'], m.io)).toBe(2);
    expect(m.out()).toContain('[config/repo-missing]');
  });
});

describe('gitleaf provenance', () => {
  it('prints ranges and a summary for a file in a git repository', async () => {
    const { execFileSync } = await import('node:child_process');
    const root = await mkdtemp(join(tmpdir(), 'gitleaf-prov-cli-'));
    const git = (...args: string[]) =>
      execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', encoding: 'utf8' }).trim();
    git('init', '-q', '-b', 'main');
    git('config', 'user.name', 'Sam');
    git('config', 'user.email', 'sam@example.com');
    git('config', 'commit.gpgsign', 'false');
    await write(root, {
      'gitleaf.yaml': 'schema: gitleaf/config@1\nroots: [{ path: docs }]\n',
      'docs/a.md': 'one\ntwo\n',
    });
    git('add', '.');
    git('commit', '-q', '-m', 'Add\n\nCo-Authored-By: Copilot <copilot@github.com>');
    const t = io(root);
    expect(await main(['provenance', 'docs/a.md'], t.io)).toBe(0);
    const lines = t.out().trimEnd().split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(
      /^1-2\s+mixed\s+[0-9a-f]{7}\s+\d{4}-\d{2}-\d{2}\s+Sam \+ Copilot\s+\[trailer\]$/,
    );
    expect(lines[1]).toBe('docs/a.md: 2 lines, 0% human, 0% agent, 100% mixed, 0% unknown');
    const j = io(root);
    expect(await main(['provenance', '--json', 'docs/a.md'], j.io)).toBe(0);
    expect((JSON.parse(j.out()) as { byKind: { mixed: number } }).byKind.mixed).toBe(2);
    expect(await main(['provenance'], io(root).io)).toBe(2);
    expect(await main(['provenance', '../outside.md'], io(root).io)).toBe(2);
  });
});
