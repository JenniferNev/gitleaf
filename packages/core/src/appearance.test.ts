import { describe, expect, it } from 'vitest';
import {
  escapeHtml,
  isPackRelativeUrl,
  validateCopy,
  validateManifest,
  validateMascotMap,
  validateSvg,
  validateTokensCss,
} from './appearance.js';

describe('tokens CSS allowlist', () => {
  it('accepts allowed selectors with --gl-* declarations and relative urls', () => {
    const css = `/* Acme */\n:root { --gl-radius-card: 8px; --gl-mascot-size: 48px; }\nbody.vscode-dark, body.vscode-high-contrast { --gl-brand-glow: none; --gl-font-display: url(fonts/Display.woff2); }`;
    expect(validateTokensCss(css)).toEqual([]);
  });

  it('rejects other selectors, non --gl- properties and dangerous constructs', () => {
    const css = `.card { color: red; } :root { --gl-x: 1; background: url(https://evil/x.png); } @import "x.css";`;
    const messages = validateTokensCss(css).map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        expect.stringContaining('forbidden construct @import'),
        'url(https://evil/x.png) must be a relative path inside the pack',
        'selector ".card" is not allowed (use :root, body.vscode-light, body.vscode-dark, body.vscode-high-contrast)',
        '"color" is not a --gl-* custom property',
        '"background" is not a --gl-* custom property',
      ]),
    );
    expect(
      validateTokensCss(':root { --gl-a: expression(alert(1)) }').some((i) =>
        i.message.includes('expression'),
      ),
    ).toBe(true);
    expect(
      validateTokensCss(':root { --gl-a: 1;').some((i) => i.message === 'unbalanced braces'),
    ).toBe(true);
    expect(
      validateTokensCss('--gl-a: 1;').some((i) => i.message.startsWith('declarations outside')),
    ).toBe(true);
  });

  it('isPackRelativeUrl', () => {
    expect(isPackRelativeUrl('assets/a.svg')).toBe(true);
    expect(isPackRelativeUrl('./a.svg')).toBe(true);
    expect(isPackRelativeUrl('../fonts/a.woff2')).toBe(true);
    expect(['/a.svg', '//cdn/a', 'https://x', 'data:x', '#x', ''].map(isPackRelativeUrl)).toEqual([
      false,
      false,
      false,
      false,
      false,
      false,
    ]);
  });
});

describe('SVG, copy, mascot map and manifest', () => {
  it('rejects scripts, handlers, foreignObject and external hrefs in SVG', () => {
    expect(
      validateSvg('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>', 'a.svg'),
    ).toEqual([]);
    const bad =
      '<svg><script>x</script><a onclick="y"></a><foreignObject/><use xlink:href="https://x/#y"/></svg>';
    expect(validateSvg(bad, 'b.svg').map((i) => i.message)).toEqual([
      'contains <script>',
      'contains <foreignObject>',
      'contains on* event attribute',
      'contains external or script href',
    ]);
    expect(validateSvg('<div/>', 'c.svg')[0]?.message).toBe('not an SVG document');
  });

  it('copy must be flat strings', () => {
    expect(validateCopy({ hello: 'Hi', bye: 'Bye' }, 'copy.en.json')).toEqual([]);
    expect(validateCopy({ hello: 1 }, 'c.json')[0]?.message).toBe('"hello" must be a string');
    expect(validateCopy([], 'c.json')).toHaveLength(1);
  });

  it('mascot map allows known moments only, with relative faces', () => {
    expect(
      validateMascotMap(
        { 'empty-docs': { face: 'mascot/hello.svg', voice: 'Nothing here yet' } },
        'm.json',
      ),
    ).toEqual([]);
    const issues = validateMascotMap(
      { error: { face: '/abs.svg' }, 'doc-merged': 'x' },
      'm.json',
    ).map((i) => i.message);
    expect(issues).toEqual([
      'moment "error" is not one Gitleaf shows a mascot for; it will be ignored',
      '"error".face must be a relative SVG path',
      '"doc-merged" must be an object with face and optional voice',
    ]);
  });

  it('manifest shape', () => {
    expect(
      validateManifest({
        id: 'acme',
        label: 'Acme',
        tokens: './appearance/acme.tokens.css',
        copy: { en: './copy.en.json' },
      }),
    ).toEqual([]);
    expect(
      validateManifest({
        id: 'Bad Id',
        label: '',
        tokens: 'https://x/t.css',
        logo: 'logo.png',
      }).map((i) => i.message),
    ).toEqual([
      'id must match ^[a-z][a-z0-9-]*$',
      'label is required',
      'tokens must be a relative .css path',
      'logo must be a relative .svg path',
    ]);
  });

  it('escapeHtml', () => {
    expect(escapeHtml(`<b onclick="x">it's & done</b>`)).toBe(
      '&lt;b onclick=&quot;x&quot;&gt;it&#39;s &amp; done&lt;/b&gt;',
    );
  });
});
