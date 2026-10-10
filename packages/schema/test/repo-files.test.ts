/**
 * Dogfooding: every doc, backlog item and config file in this repository must
 * validate against its schema (acceptance criterion of ST-KT3NG4K8).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validate, validateByMarker } from '../src/index.js';
import { frontmatterOf, loadYaml } from './helpers.js';

const repoRoot = new URL('../../../', import.meta.url).pathname;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (entry.endsWith('.md')) out.push(p);
  }
  return out;
}

describe('this repository validates against its own schemas', () => {
  const docs = walk(join(repoRoot, 'docs'));
  const items = walk(join(repoRoot, 'agile', 'items'));

  it('finds the files it is supposed to check', () => {
    expect(docs.length).toBeGreaterThan(10);
    expect(items.length).toBeGreaterThan(5);
  });

  it.each(docs.map((p) => [relative(repoRoot, p), p]))('%s', (_name, path) => {
    const fm = frontmatterOf(readFileSync(path, 'utf8'));
    if (fm === undefined) return; // frontmatter is optional for docs
    expect(validateByMarker(fm, 'gitleaf/doc@1')).toEqual({ ok: true, issues: [] });
  });

  it.each(items.map((p) => [relative(repoRoot, p), p]))('%s', (_name, path) => {
    const fm = frontmatterOf(readFileSync(path, 'utf8'));
    expect(fm, 'every item needs frontmatter').toBeDefined();
    expect(validate('gitleaf/item@1', fm)).toEqual({ ok: true, issues: [] });
  });

  it('agile/config.yaml', () => {
    expect(
      validate('gitleaf/agile-config@1', loadYaml(join(repoRoot, 'agile', 'config.yaml'))),
    ).toEqual({
      ok: true,
      issues: [],
    });
  });

  it('gitleaf.yaml', () => {
    expect(validate('gitleaf/config@1', loadYaml(join(repoRoot, 'gitleaf.yaml')))).toEqual({
      ok: true,
      issues: [],
    });
  });

  it('item ids are unique', () => {
    const ids = items.map((p) => (frontmatterOf(readFileSync(p, 'utf8')) as { id: string }).id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
