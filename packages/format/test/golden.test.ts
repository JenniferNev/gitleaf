import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse, serialize } from '../src/index.js';

const dir = new URL('./golden/', import.meta.url).pathname;
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.md'))
  .sort();

describe('golden fixtures round-trip byte for byte', () => {
  it('has fixtures', () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
  });

  it.each(files)('%s', (name) => {
    const bytes = readFileSync(join(dir, name));
    const text = bytes.toString('utf8');
    const doc = parse(text);
    const out = Buffer.from(serialize(doc), 'utf8');
    expect(out.equals(bytes), 'serialize(parse(x)) must equal x byte for byte').toBe(true);
    // The body is a suffix of the original bytes, untouched.
    expect(bytes.toString('utf8').endsWith(doc.body)).toBe(true);
  });
});

describe('parse facts per fixture', () => {
  const load = (name: string) => parse(readFileSync(join(dir, name), 'utf8'));

  it('no-frontmatter.md: horizontal rules are body', () => {
    const d = load('no-frontmatter.md');
    expect(d.frontmatter).toBeUndefined();
    expect(d.meta.hasFrontmatter).toBe(false);
    expect(d.body.startsWith('# No frontmatter')).toBe(true);
  });

  it('crlf.md: CRLF is detected and preserved', () => {
    const d = load('crlf.md');
    expect(d.meta.eol).toBe('\r\n');
    expect(d.frontmatter).toEqual({ title: 'Windows file', status: 'draft' });
    expect(d.body).toBe('\r\nBody with CRLF.\r\n');
  });

  it('unicode.md', () => {
    const d = load('unicode.md');
    expect(d.frontmatter).toEqual({
      title: 'Ünïcödé — 日本語 🦊',
      owners: ['sam', '李'],
      tags: ['docs', 'español'],
    });
  });

  it('comments.md: comments survive in the raw text and values parse', () => {
    const d = load('comments.md');
    expect(d.frontmatter).toEqual({
      schema: 'gitleaf/doc@1',
      id: 'DOC-7K3MQ2RS',
      title: 'Comments everywhere',
      status: 'published',
    });
    expect(d.meta.frontmatterText).toContain('# Comment between keys');
  });

  it('empty-body.md and empty-body-no-eol.md', () => {
    expect(load('empty-body.md').body).toBe('');
    const n = load('empty-body-no-eol.md');
    expect(n.body).toBe('');
    expect(n.meta.closeEol).toBe('');
  });

  it('empty-frontmatter.md is an empty mapping', () => {
    const d = load('empty-frontmatter.md');
    expect(d.frontmatter).toEqual({});
    expect(d.body).toBe('Empty frontmatter block.\n');
  });

  it('bom.md keeps the byte order mark', () => {
    const d = load('bom.md');
    expect(d.meta.bom).toBe(true);
    expect(d.frontmatter).toEqual({ title: 'With BOM' });
  });

  it('quoted-gotchas.md: quoted strings stay strings, bare values keep their types', () => {
    expect(load('quoted-gotchas.md').frontmatter).toEqual({
      title: 'yes',
      version: '1.0',
      zip: '01234',
      empty: '',
      spaced: ' padded ',
      number: 42,
      flag: true,
      nothing: null,
    });
  });

  it('dates stay strings', () => {
    expect(parse('---\ncreated: 2026-10-09\n---\n').frontmatter).toEqual({ created: '2026-10-09' });
  });

  it('unterminated.md is all body', () => {
    const d = load('unterminated.md');
    expect(d.frontmatter).toBeUndefined();
    expect(d.meta.hasFrontmatter).toBe(false);
  });

  it('invalid-yaml.md and not-a-mapping.md keep bytes and report an error', () => {
    const bad = load('invalid-yaml.md');
    expect(bad.frontmatter).toBeUndefined();
    expect(bad.meta.hasFrontmatter).toBe(true);
    expect(bad.meta.frontmatterError).toBeDefined();
    expect(bad.body).toBe('Body survives an invalid frontmatter.\n');
    expect(load('not-a-mapping.md').meta.frontmatterError).toMatch(/mapping/);
  });

  it('empty-file.md and no-eol.md', () => {
    expect(load('empty-file.md')).toMatchObject({ frontmatter: undefined, body: '' });
    expect(load('no-eol.md').body).toBe('no trailing newline');
  });
});
