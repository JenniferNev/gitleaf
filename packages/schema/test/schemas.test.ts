import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SCHEMAS,
  SCHEMA_IDS,
  isSchemaId,
  keyOrder,
  parseSchemaId,
  validate,
  validateByMarker,
} from '../src/index.js';
import { loadYaml } from './helpers.js';

const fx = (p: string) => loadYaml(new URL(`./fixtures/${p}`, import.meta.url).pathname);

describe('registry', () => {
  it('knows four formats and parses markers', () => {
    expect(SCHEMA_IDS).toEqual([
      'gitleaf/doc@1',
      'gitleaf/config@1',
      'gitleaf/item@1',
      'gitleaf/agile-config@1',
    ]);
    expect(parseSchemaId('gitleaf/doc@1')).toEqual({ kind: 'doc', version: 1 });
    expect(parseSchemaId('gitleaf/doc@01')).toBeUndefined();
    expect(parseSchemaId('reposcrum/item@1')).toBeUndefined();
    expect(isSchemaId('gitleaf/item@1')).toBe(true);
    expect(isSchemaId('gitleaf/item@2')).toBe(false);
  });

  it('every schema is draft 2020-12, forbids unknown keys and allows x- keys', () => {
    for (const id of SCHEMA_IDS) {
      const s = SCHEMAS[id] as Record<string, unknown>;
      expect(s.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(s.additionalProperties).toBe(false);
      expect(Object.keys(s.patternProperties as object)).toEqual(['^x-']);
    }
  });

  it('exposes the canonical key order from the schema', () => {
    expect(keyOrder('gitleaf/doc@1')).toEqual([
      'schema',
      'id',
      'title',
      'owners',
      'status',
      'tags',
      'review_by',
    ]);
    expect(keyOrder('gitleaf/item@1').slice(0, 5)).toEqual([
      'schema',
      'id',
      'type',
      'title',
      'status',
    ]);
  });
});

describe('gitleaf/doc@1', () => {
  it('accepts full and minimal frontmatter', () => {
    expect(validate('gitleaf/doc@1', fx('doc/valid-full.yaml'))).toEqual({ ok: true, issues: [] });
    expect(validate('gitleaf/doc@1', fx('doc/valid-minimal.yaml')).ok).toBe(true);
    expect(validate('gitleaf/doc@1', {}).ok).toBe(true);
  });

  it('rejects unknown keys outside x-', () => {
    const r = validate('gitleaf/doc@1', fx('doc/invalid-unknown-key.yaml'));
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.message)).toEqual([
      'unknown key "author" (only x- keys may be added)',
    ]);
  });

  it('reports every problem with a path', () => {
    const r = validate('gitleaf/doc@1', fx('doc/invalid-status-and-id.yaml'));
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path).sort()).toEqual(['/id', '/review_by', '/status']);
    expect(r.issues.find((i) => i.path === '/status')?.message).toBe(
      'must be one of "draft", "in-review", "published", "archived"',
    );
  });

  it('rejects the wrong marker and a non-object', () => {
    expect(validate('gitleaf/doc@1', { schema: 'gitleaf/item@1' }).ok).toBe(false);
    expect(validate('gitleaf/doc@1', 'title: x').ok).toBe(false);
    expect(validate('gitleaf/doc@1', null).ok).toBe(false);
  });
});

describe('gitleaf/config@1', () => {
  it('accepts multi-repo roots, rules, forge and secrets with references', () => {
    expect(validate('gitleaf/config@1', fx('config/valid.yaml'))).toEqual({ ok: true, issues: [] });
  });

  it('rejects a secret value where a reference is expected', () => {
    const r = validate('gitleaf/config@1', fx('config/invalid-secret-value.yaml'));
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.path)).toEqual(['/forge/token']);
  });

  it('rejects absolute, escaping and backslash paths', () => {
    const r = validate('gitleaf/config@1', fx('config/invalid-paths.yaml'));
    expect(r.ok).toBe(false);
    expect(new Set(r.issues.map((i) => i.path))).toEqual(
      new Set(['/roots/0/path', '/roots/1/path', '/roots/2/path']),
    );
  });

  it('requires schema and at least one root', () => {
    const r = validate('gitleaf/config@1', { schema: 'gitleaf/config@1', roots: [] });
    expect(r.ok).toBe(false);
    expect(validate('gitleaf/config@1', { roots: [{ path: 'docs' }] }).ok).toBe(false);
  });
});

describe('validateByMarker', () => {
  it('uses the marker when present and the fallback otherwise', () => {
    expect(validateByMarker({ title: 'x' }, 'gitleaf/doc@1').ok).toBe(true);
    expect(validateByMarker(fx('config/valid.yaml'), 'gitleaf/doc@1').ok).toBe(true);
    const r = validateByMarker({ schema: 'reposcrum/item@1' }, 'gitleaf/doc@1');
    expect(r.ok).toBe(false);
    expect(r.issues[0]?.path).toBe('/schema');
  });
});

describe('generated types stay in sync with the schemas', () => {
  it('generated index lists every schema', () => {
    const index = readFileSync(new URL('../src/generated/index.ts', import.meta.url), 'utf8');
    for (const id of SCHEMA_IDS) {
      const base = id.slice('gitleaf/'.length).replace('@', '-');
      expect(index).toContain(`'./${base}.js'`);
    }
  });
});
