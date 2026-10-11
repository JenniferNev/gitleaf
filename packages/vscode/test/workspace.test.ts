import { describe, expect, it } from 'vitest';
import type { Diagnostic } from '@gitleaf/core';
import type { DocIndex, IndexedDoc } from '@gitleaf/index';
import { parse } from '@gitleaf/format';
import { agentsMdStub, gitleafYaml, mergeClaudeSettings, planInit } from '../src/workspace/init.js';
import {
  childNodes,
  countProblems,
  groupByFile,
  rootNodes,
  titleOf,
} from '../src/workspace/model.js';

function doc(repo: string, path: string, text: string): IndexedDoc {
  return {
    repo,
    path,
    root: { path: 'docs', include: ['**/*.md'], exclude: [] },
    text,
    doc: parse(text),
    links: [],
  };
}

const index: DocIndex = {
  docs: [
    doc('.', 'docs/b.md', '---\ntitle: Beta\nstatus: published\nowners: [sam]\n---\n'),
    doc('.', 'docs/a.md', '# Alpha heading\n'),
    doc('.', 'docs/sub/deep.md', 'plain\n'),
    doc('.', 'docs/sub/other/x.md', ''),
    doc('../other', 'handbook/h.md', '---\ntitle: H\n---\n'),
  ],
  paths: new Map(),
  byName: new Map(),
};

describe('docs tree model', () => {
  it('builds root nodes with repo-aware descriptions', () => {
    const roots = rootNodes(
      [
        { repo: '.', path: 'docs', name: 'Docs' },
        { repo: '../other', path: 'handbook' },
      ],
      (r) => (r === '.' ? 'me' : r),
    );
    expect(roots.map((r) => [r.label, r.description])).toEqual([
      ['Docs', 'docs'],
      ['handbook', '../other · handbook'],
    ]);
  });

  it('lists folders first then docs, with titles from frontmatter or heading or filename', () => {
    const problems = new Map([['.:docs/a.md', 2]]);
    const [root] = rootNodes([{ repo: '.', path: 'docs' }], () => '');
    const children = childNodes(index, root!, problems);
    expect(children.map((c) => [c.kind, c.label, 'description' in c ? c.description : ''])).toEqual(
      [
        ['folder', 'sub', ''],
        ['doc', 'Alpha heading', '2 problems'],
        ['doc', 'Beta', 'published · sam'],
      ],
    );
    const sub = children[0]!;
    expect(sub.kind).toBe('folder');
    const subChildren = childNodes(index, sub as never, problems);
    expect(subChildren.map((c) => c.label)).toEqual(['other', 'deep.md']);
  });

  it('counts and groups problems', () => {
    const d: Diagnostic[] = [
      { repo: '.', path: 'docs/a.md', line: 1, severity: 'error', rule: 'x', message: 'm' },
      { repo: '.', path: 'docs/a.md', line: 2, severity: 'warning', rule: 'y', message: 'm' },
      { repo: 'o', path: 'h.md', line: 1, severity: 'error', rule: 'x', message: 'm' },
    ];
    expect([...countProblems(d)]).toEqual([
      ['.:docs/a.md', 2],
      ['o:h.md', 1],
    ]);
    expect([...groupByFile(d, (r, p) => `/${r}/${p}`).keys()]).toEqual(['/./docs/a.md', '/o/h.md']);
  });

  it('titleOf', () => {
    expect(titleOf(doc('.', 'docs/x.md', ''))).toBe('x.md');
  });
});

describe('initialize workspace', () => {
  it('creates everything in an empty repo, including a starter doc', () => {
    const plan = planInit({ hasDocsFolder: false, exists: () => false, read: () => '' });
    expect(plan.map((p) => [p.path, p.action])).toEqual([
      ['gitleaf.yaml', 'create'],
      ['AGENTS.md', 'create'],
      ['.claude/settings.json', 'create'],
      ['docs/README.md', 'create'],
    ]);
    expect(plan[0]?.content).toBe(gitleafYaml('docs'));
    expect(plan[1]?.content).toBe(agentsMdStub());
    expect(JSON.parse(plan[2]?.content ?? '')).toEqual({
      extraKnownMarketplaces: {
        gitleaf: { source: { source: 'github', repo: 'JenniferNev/gitleaf' } },
      },
      enabledPlugins: { 'gitleaf@gitleaf': true },
    });
  });

  it('never overwrites and merges existing Claude settings', () => {
    const files: Record<string, string> = {
      'gitleaf.yaml': 'schema: gitleaf/config@1\nroots: [{ path: wiki }]\n',
      'AGENTS.md': '# mine\n',
      '.claude/settings.json': JSON.stringify({
        permissions: { allow: ['Bash(ls)'] },
        enabledPlugins: { 'other@x': true },
      }),
    };
    const plan = planInit({
      hasDocsFolder: true,
      exists: (p) => p in files,
      read: (p) => files[p] ?? '',
    });
    expect(plan.map((p) => [p.path, p.action])).toEqual([
      ['gitleaf.yaml', 'skip'],
      ['AGENTS.md', 'skip'],
      ['.claude/settings.json', 'merge'],
    ]);
    const merged = JSON.parse(plan[2]?.content ?? '') as Record<string, unknown>;
    expect(merged.permissions).toEqual({ allow: ['Bash(ls)'] });
    expect(merged.enabledPlugins).toEqual({ 'other@x': true, 'gitleaf@gitleaf': true });
    // Second run is a no-op.
    const again = planInit({
      hasDocsFolder: true,
      exists: (p) => p in files || p === '.claude/settings.json',
      read: (p) => (p === '.claude/settings.json' ? (plan[2]?.content ?? '') : (files[p] ?? '')),
    });
    expect(again.map((p) => p.action)).toEqual(['skip', 'skip', 'skip']);
  });

  it('keeps an unparsable settings file untouched', () => {
    const plan = planInit({
      hasDocsFolder: true,
      exists: (p) => p === '.claude/settings.json',
      read: () => '{ not json',
    });
    expect(plan.find((p) => p.path === '.claude/settings.json')?.action).toBe('skip');
    expect(mergeClaudeSettings('garbage')).toEqual(mergeClaudeSettings({}));
  });
});
