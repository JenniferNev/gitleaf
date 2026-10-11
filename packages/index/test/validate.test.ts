import type { Diagnostic } from '@gitleaf/core';
import type { GitleafConfig } from '@gitleaf/schema';
import { describe, expect, it } from 'vitest';
import { buildIndex, validateIndex, type IndexedDoc } from '../src/index.js';
import { MemoryStore } from './memory-store.js';

const NOW = new Date('2026-10-11T00:00:00Z');

async function run(
  files: Record<string, Record<string, string>>,
  config: Partial<GitleafConfig> = {},
  lastModified: (doc: IndexedDoc) => Promise<Date | undefined> = () => Promise.resolve(undefined),
): Promise<readonly Diagnostic[]> {
  const store = new MemoryStore(files);
  const cfg: GitleafConfig = { schema: 'gitleaf/config@1', roots: [{ path: 'docs' }], ...config };
  const index = await buildIndex(store, cfg);
  return validateIndex(index, cfg, { store, now: NOW, lastModified });
}

const brief = (d: readonly Diagnostic[]) =>
  d.map((x) => `${x.path}:${String(x.line)}:${x.severity}:${x.rule}`);

describe('validateIndex', () => {
  it('passes a clean workspace', async () => {
    const d = await run({
      '.': { 'docs/a.md': '---\ntitle: A\n---\nSee [b](b.md).\n', 'docs/b.md': '# B\n' },
    });
    expect(d).toEqual([]);
  });

  it('reports schema problems at the key line', async () => {
    const d = await run({ '.': { 'docs/a.md': '---\ntitle: A\nstatus: live\nauthor: x\n---\n' } });
    expect(brief(d)).toEqual([
      'docs/a.md:3:error:frontmatter/schema',
      'docs/a.md:4:error:frontmatter/schema',
    ]);
    expect(d[0]?.message).toBe(
      'status must be one of "draft", "in-review", "published", "archived"',
    );
    expect(d[1]?.message).toContain('unknown key "author"');
  });

  it('reports invalid YAML with a line', async () => {
    const d = await run({ '.': { 'docs/a.md': '---\ntitle: A\nowners: [x\n---\n' } });
    expect(brief(d)).toEqual(['docs/a.md:4:error:frontmatter/yaml']);
  });

  it('finds broken, escaping and fine relative links, respecting rules.links', async () => {
    const files = {
      '.': {
        'docs/a.md': '[x](missing.md) [y](../../etc) [ok](sub/ok.md) [img](img.png)\n',
        'docs/sub/ok.md': '',
        'docs/img.png': 'binary',
      },
    };
    const d = await run(files);
    expect(brief(d)).toEqual([
      'docs/a.md:1:error:links/broken',
      'docs/a.md:1:error:links/escapes-repo',
    ]);
    expect(d[0]?.column).toBe(5);
    expect(
      (await run(files, { rules: { links: 'warn' } })).every((x) => x.severity === 'warning'),
    ).toBe(true);
    expect(await run(files, { rules: { links: 'off' } })).toEqual([]);
  });

  it('resolves wikilinks by name across repos and flags ambiguity', async () => {
    const files = {
      '.': { 'docs/a.md': '[[Setup]] [[Nope]] [[dup]]\n', 'docs/dup.md': '' },
      '../other': { 'handbook/setup.md': '', 'handbook/Dup.md': '' },
    };
    const d = await run(files, {
      roots: [{ path: 'docs' }, { path: 'handbook', repo: '../other' }],
    });
    expect(brief(d)).toEqual([
      'docs/a.md:1:error:links/broken',
      'docs/a.md:1:warning:links/ambiguous',
    ]);
    expect(d[0]?.message).toContain('[[Nope]]');
  });

  it('requires owners when configured, with and without frontmatter', async () => {
    const files = {
      '.': {
        'docs/a.md': '---\ntitle: A\n---\n',
        'docs/b.md': 'no frontmatter\n',
        'docs/c.md': '---\nowners: [sam]\n---\n',
      },
    };
    expect(brief(await run(files, { rules: { owners: 'required' } }))).toEqual([
      'docs/a.md:1:error:owners/missing',
      'docs/b.md:1:error:owners/missing',
    ]);
    expect(await run(files)).toEqual([]);
  });

  it('flags secret values and malformed references, never secret:// refs', async () => {
    const files = {
      '.': {
        'docs/a.md':
          '---\ntitle: A\nx-deploy:\n  api_key: abc123\n  token: secret://infisical/x\n  password: "secret://bad space"\n---\n',
      },
    };
    const d = await run(files);
    expect(brief(d)).toEqual([
      'docs/a.md:3:error:secrets/malformed-ref',
      'docs/a.md:3:error:secrets/value',
    ]);
    expect(d[1]?.message).toBe(
      'x-deploy.api_key: a secret value where a secret:// reference is expected',
    );
  });

  it('warns on stale docs, overdue reviews and CRLF, and skips archived docs', async () => {
    const files = {
      '.': {
        'docs/old.md': '---\ntitle: Old\nreview_by: 2026-01-01\n---\n',
        'docs/archived.md': '---\nstatus: archived\n---\n',
        'docs/crlf.md': '---\r\ntitle: W\r\n---\r\n',
      },
    };
    const d = await run(files, { rules: { stale_after_days: 30 } }, () =>
      Promise.resolve(new Date('2026-01-01')),
    );
    expect(brief(d)).toEqual([
      'docs/crlf.md:1:warning:docs/stale',
      'docs/crlf.md:1:warning:format/line-endings',
      'docs/old.md:1:warning:docs/stale',
      'docs/old.md:3:warning:docs/review-overdue',
    ]);
  });

  it('reports duplicate ids on every file involved', async () => {
    const files = {
      '.': {
        'docs/a.md': '---\nid: DOC-7K3MQ2RS\n---\n',
        'docs/b.md': '---\nid: DOC-7K3MQ2RS\n---\n',
      },
    };
    expect(brief(await run(files))).toEqual([
      'docs/a.md:2:error:ids/duplicate',
      'docs/b.md:2:error:ids/duplicate',
    ]);
  });

  it('validates agile items by their marker', async () => {
    const files = {
      '.': {
        'agile/items/x.md':
          '---\nschema: gitleaf/item@1\nid: ST-37MPP7WD\ntype: story\ntitle: T\nstatus: nope\ncreated: 2026-10-09\n---\n',
      },
    };
    const d = await run(files, { roots: [{ path: 'agile/items' }] });
    expect(brief(d)).toEqual(['agile/items/x.md:6:error:frontmatter/schema']);
  });
});
