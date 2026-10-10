import { describe, expect, it } from 'vitest';
import { createDoc, needsQuotes, parse, serialize, update } from '../src/index.js';

function changedLines(before: string, after: string): { added: string[]; removed: string[] } {
  const a = before.split('\n');
  const b = after.split('\n');
  const removed = a.filter((line) => !b.includes(line));
  const added = b.filter((line) => !a.includes(line));
  return { added, removed };
}

const SAMPLE = `---
# Leading comment
schema: gitleaf/doc@1
id: DOC-7K3MQ2RS   # trailing comment
title: "Original title"
owners: [sam, li]
tags:
  - docs
  - process
status: draft
---

Body stays.
`;

describe('update changes only what it is asked to', () => {
  it('rewrites one scalar in place, keeping its trailing comment', () => {
    const out = serialize(update(parse(SAMPLE), { status: 'published' }));
    const { added, removed } = changedLines(SAMPLE, out);
    expect(removed).toEqual(['status: draft']);
    expect(added).toEqual(['status: published']);
  });

  it('keeps a trailing comment when the commented value changes', () => {
    const out = serialize(update(parse(SAMPLE), { id: 'DOC-AAAAAAAA' }));
    expect(out).toContain('id: DOC-AAAAAAAA   # trailing comment');
    expect(changedLines(SAMPLE, out).added).toHaveLength(1);
  });

  it('replaces a flow list on its one line', () => {
    const out = serialize(update(parse(SAMPLE), { owners: ['maria'] }));
    const { added, removed } = changedLines(SAMPLE, out);
    expect(removed).toEqual(['owners: [sam, li]']);
    expect(added).toEqual(['owners: [ maria ]']);
  });

  it('keeps block style for a block list', () => {
    const out = serialize(update(parse(SAMPLE), { tags: ['p', 'q', 'r'] }));
    expect(out).toContain('tags:\n  - p\n  - q\n  - r\nstatus: draft');
    expect(parse(out).frontmatter).toMatchObject({ tags: ['p', 'q', 'r'], status: 'draft' });
  });

  it('inserts a new key at its canonical position as one line', () => {
    const out = serialize(update(parse(SAMPLE), { review_by: '2027-01-31' }));
    const { added, removed } = changedLines(SAMPLE, out);
    expect(removed).toEqual([]);
    expect(added).toEqual(['review_by: 2027-01-31']);
    // doc@1 order: ... status, review_by → after status.
    expect(out).toContain('status: draft\nreview_by: 2027-01-31\n---');
  });

  it('inserts an unknown x- key at the end and a canonical key before later ones', () => {
    const withX = serialize(update(parse(SAMPLE), { 'x-source': 'confluence' }));
    expect(withX).toContain('status: draft\nx-source: confluence\n---');
    const noTitle = SAMPLE.replace('title: "Original title"\n', '');
    const withTitle = serialize(update(parse(noTitle), { title: 'Inserted' }));
    expect(withTitle).toContain('id: DOC-7K3MQ2RS   # trailing comment\ntitle: Inserted\nowners:');
  });

  it('removes a key with its whole value', () => {
    const out = serialize(update(parse(SAMPLE), { tags: undefined, id: undefined }));
    expect(out).not.toContain('tags');
    expect(out).not.toContain('- docs');
    expect(out).not.toContain('trailing comment');
    expect(changedLines(SAMPLE, out).added).toEqual([]);
    expect(parse(out).frontmatter).toEqual({
      schema: 'gitleaf/doc@1',
      title: 'Original title',
      owners: ['sam', 'li'],
      status: 'draft',
    });
  });

  it('quotes gotcha strings and leaves others plain', () => {
    const out = serialize(
      update(parse(SAMPLE), { title: 'no', 'x-v': '1.0', 'x-z': '007', 'x-ok': 'Plain words' }),
    );
    expect(out).toContain('title: "no"');
    expect(out).toContain('x-v: "1.0"');
    expect(out).toContain('x-z: "007"');
    expect(out).toContain('x-ok: Plain words');
    expect(parse(out).frontmatter).toMatchObject({ title: 'no', 'x-v': '1.0', 'x-z': '007' });
  });

  it('never touches the body or the line ending', () => {
    const crlf = SAMPLE.replaceAll('\n', '\r\n');
    const out = serialize(update(parse(crlf), { status: 'published', review_by: '2027-01-31' }));
    expect(out).not.toMatch(/[^\r]\n/);
    expect(parse(out).body).toBe('\r\nBody stays.\r\n');
    expect(parse(out).frontmatter).toMatchObject({ status: 'published', review_by: '2027-01-31' });
  });

  it('adds a frontmatter block to a plain document', () => {
    const out = serialize(update(parse('# Hello\n'), { title: 'Hello' }));
    expect(out).toBe('---\ntitle: Hello\n---\n# Hello\n');
  });

  it('fills an empty value and empties to an empty block', () => {
    expect(serialize(update(parse('---\ntitle:\n---\n'), { title: 'x' }))).toBe(
      '---\ntitle: x\n---\n',
    );
    expect(serialize(update(parse('---\ntitle: x\n---\nb'), { title: undefined }))).toBe(
      '---\n---\nb',
    );
  });

  it('refuses to edit invalid frontmatter', () => {
    expect(() => update(parse('---\ntitle: [broken\n---\n'), { title: 'x' })).toThrow(
      /cannot update/,
    );
  });
});

describe('createDoc', () => {
  it('writes canonical order, block style, LF and quoting', () => {
    const doc = createDoc('Body\n', {
      tags: ['b', 'a'],
      title: 'yes',
      owners: ['sam'],
      id: 'DOC-7K3MQ2RS',
    });
    expect(serialize(doc)).toBe(
      '---\nid: DOC-7K3MQ2RS\ntitle: "yes"\nowners:\n  - sam\ntags:\n  - b\n  - a\n---\nBody\n',
    );
    expect(parse(serialize(doc)).frontmatter).toEqual(doc.frontmatter);
  });

  it('orders item keys by the item schema and appends x- keys', () => {
    const doc = createDoc('', {
      'x-extra': 1,
      status: 'ready',
      schema: 'gitleaf/item@1',
      id: 'ST-37MPP7WD',
    });
    expect(Object.keys(doc.frontmatter!)).toEqual(['schema', 'id', 'status', 'x-extra']);
  });

  it('makes a plain document without frontmatter', () => {
    expect(serialize(createDoc('just text'))).toBe('just text');
  });
});

describe('needsQuotes', () => {
  it.each([
    'yes',
    'No',
    'ON',
    'off',
    'y',
    'n',
    'true',
    'null',
    '~',
    '1.0',
    '2.3.4',
    '007',
    '42',
    '-1',
    '.5',
    '1e3',
    '.inf',
    '0x1F',
    '',
    ' padded ',
  ])('quotes %j', (s) => {
    expect(needsQuotes(s)).toBe(true);
  });
  it.each(['hello', 'in-review', 'Release process', 'v1.0', '2026-10-09', 'DOC-7K3MQ2RS', 'sí'])(
    'leaves %j plain',
    (s) => {
      expect(needsQuotes(s)).toBe(false);
    },
  );
});
