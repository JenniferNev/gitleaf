/**
 * Property-based tests (acceptance criteria of ST-96WHP0KK):
 * - parse → serialize is the identity on every document createDoc can make, plus arbitrary bodies;
 * - updating one frontmatter field changes exactly one line;
 * - body bytes are never modified.
 */
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createDoc, parse, serialize, update } from '../src/index.js';

const scalarString = fc.oneof(
  fc.string({ minLength: 0, maxLength: 40 }).filter((s) => !/[\n\r]/.test(s)),
  fc.constantFrom(
    'yes',
    'no',
    'on',
    'off',
    'null',
    '~',
    '1.0',
    '007',
    '42',
    '',
    ' x ',
    '日本語',
    '🦊',
    'a: b',
    '# not a comment',
    '- not a list',
  ),
);
const scalar = fc.oneof(scalarString, fc.integer(), fc.boolean(), fc.constant(null));
const key = fc.oneof(
  fc.constantFrom('schema', 'id', 'title', 'owners', 'status', 'tags', 'review_by'),
  fc.stringMatching(/^x-[a-z][a-z0-9-]{0,10}$/),
);
const frontmatter = fc
  .dictionary(key, fc.oneof(scalar, fc.array(scalarString, { maxLength: 4 })), {
    minKeys: 1,
    maxKeys: 8,
  })
  .filter((fm) => fm.schema === undefined || typeof fm.schema === 'string');
const body = fc.oneof(
  fc.string({ maxLength: 200 }),
  fc.constantFrom(
    '',
    '---\n',
    '\n---\n---\n',
    'no newline',
    '\r\nCRLF body\r\n',
    '# Title\n\n---\n\ntext\n',
  ),
);

describe('round-trip', () => {
  it('serialize ∘ parse is the identity on created documents', () => {
    fc.assert(
      fc.property(frontmatter, body, (fm, b) => {
        const text = serialize(createDoc(b, fm));
        const parsed = parse(text);
        expect(serialize(parsed)).toBe(text);
        expect(parsed.body).toBe(b);
        expect(parsed.frontmatter).toEqual(createDoc(b, fm).frontmatter);
      }),
      { numRuns: 300 },
    );
  });

  it('serialize ∘ parse is the identity on arbitrary text', () => {
    fc.assert(
      fc.property(fc.string({ maxLength: 300 }), (text) => {
        expect(serialize(parse(text))).toBe(text);
      }),
      { numRuns: 500 },
    );
  });
});

describe('update', () => {
  it('changing one existing scalar field changes exactly one line and never the body', () => {
    fc.assert(
      fc.property(
        frontmatter.filter((fm) => Object.values(fm).some((v) => !Array.isArray(v))),
        body,
        scalar,
        fc.nat(),
        (fm, b, newValue, pick) => {
          const scalarKeys = Object.keys(fm).filter((k) => !Array.isArray(fm[k]));
          const k = scalarKeys[pick % scalarKeys.length]!;
          fc.pre(k !== 'schema');
          fc.pre(fm[k] !== newValue);
          const before = serialize(createDoc(b, fm));
          const after = serialize(update(parse(before), { [k]: newValue }));
          const a = before.split('\n');
          const z = after.split('\n');
          expect(z.length).toBe(a.length);
          const diffs = a.map((line, i) => line !== z[i]).filter(Boolean).length;
          expect(
            diffs,
            `expected one changed line\n--- before\n${before}\n--- after\n${after}`,
          ).toBe(1);
          expect(parse(after).body).toBe(b);
          expect(parse(after).frontmatter).toEqual({ ...fm, [k]: newValue });
        },
      ),
      { numRuns: 300 },
    );
  });

  it('adding one scalar field adds exactly one line; removing it restores the text', () => {
    fc.assert(
      fc.property(
        frontmatter,
        body,
        fc.stringMatching(/^x-new-[a-z]{1,6}$/),
        scalar,
        (fm, b, k, v) => {
          fc.pre(!(k in fm));
          const before = serialize(createDoc(b, fm));
          const added = serialize(update(parse(before), { [k]: v }));
          expect(added.split('\n').length).toBe(before.split('\n').length + 1);
          expect(parse(added).frontmatter).toEqual({ ...fm, [k]: v });
          expect(serialize(update(parse(added), { [k]: undefined }))).toBe(before);
        },
      ),
      { numRuns: 200 },
    );
  });
});
