import { describe, expect, it } from 'vitest';
import { extractLinks, isLocal } from '../src/index.js';

describe('extractLinks', () => {
  it('finds inline links, images, references and wikilinks with positions', () => {
    const text = [
      '# Title',
      'See [setup](./onboarding/setup.md) and ![diagram](img/a.png "Alt").',
      '[spec]: ../spec.md',
      'Also [[Release Process]] and [[auth#tokens|Auth]].',
      'Anchor [top](#title) and web [site](https://example.com) and [mail](mailto:x@y.z).',
    ].join('\n');
    const links = extractLinks(text);
    expect(links).toEqual([
      { target: './onboarding/setup.md', kind: 'markdown', line: 2, column: 13 },
      { target: 'img/a.png', kind: 'image', line: 2, column: 51 },
      { target: '../spec.md', kind: 'reference', line: 3, column: 9 },
      { target: 'Release Process', kind: 'wikilink', line: 4, column: 8 },
      { target: 'auth', fragment: 'tokens', kind: 'wikilink', line: 4, column: 32 },
      { target: '', fragment: 'title', kind: 'markdown', line: 5, column: 14 },
      { target: 'https://example.com', kind: 'markdown', line: 5, column: 37 },
      { target: 'mailto:x@y.z', kind: 'markdown', line: 5, column: 69 },
    ]);
  });

  it('skips fenced code blocks and inline code', () => {
    const text = [
      '```md',
      '[not](a-link.md)',
      '```',
      'Real [one](real.md) and `[fake](x.md)` here.',
      '~~~',
      '[[nope]]',
      '~~~',
    ].join('\n');
    expect(extractLinks(text).map((l) => l.target)).toEqual(['real.md']);
  });

  it('strips fragments and queries, handles <bracketed> targets', () => {
    const links = extractLinks('[a](<a b.md#frag>) [b](b.md?x=1#y)');
    expect(links.map((l) => [l.target, l.fragment])).toEqual([
      ['a b.md', 'frag'],
      ['b.md', 'y'],
    ]);
  });

  it('isLocal', () => {
    expect(isLocal('docs/a.md')).toBe(true);
    expect(isLocal('https://x')).toBe(false);
    expect(isLocal('mailto:a@b')).toBe(false);
    expect(isLocal('//cdn/x')).toBe(false);
    expect(isLocal('')).toBe(false);
  });
});
