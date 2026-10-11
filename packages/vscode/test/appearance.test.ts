import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  discoverPacks,
  formatRejection,
  resolveAppearance,
  type ExtensionLike,
} from '../src/appearance/loader.js';
import {
  cspFor,
  makeNonce,
  previewModel,
  renderPreview,
  TOKEN_NAMES,
} from '../src/appearance/preview.js';

const fixtures = new URL('./fixtures/packs/', import.meta.url).pathname;

function ext(name: string, publisher: string): ExtensionLike {
  const extensionPath = join(fixtures, name);
  return {
    id: `${publisher}.${name}`,
    extensionPath,
    packageJSON: JSON.parse(readFileSync(join(extensionPath, 'package.json'), 'utf8')) as unknown,
  };
}

describe('discoverPacks', () => {
  const discovery = discoverPacks([
    ext('acme-appearance', 'acme'),
    ext('evil-appearance', 'mallory'),
    { id: 'x.y', extensionPath: '/nope', packageJSON: { contributes: {} } },
  ]);

  it('loads the neutral fixture pack with its declared files only', () => {
    const pack = discovery.packs.get('acme.acme-appearance/acme');
    expect(pack).toBeDefined();
    expect(pack?.label).toBe('Acme');
    expect(pack?.tokensCss).toContain('--gl-radius-card: 10px');
    expect(pack?.copy.en?.tagline).toBe('Docs, kept.');
    expect(pack?.mascot?.map['empty-docs']?.voice).toBe('Nothing here yet.');
    const files = (pack?.files ?? []).map((f) => f.slice(pack?.extensionPath.length ?? 0));
    expect(files.sort()).toEqual([
      '/appearance/acme.tokens.css',
      '/assets/logo.svg',
      '/assets/tail.svg',
    ]);
  });

  it('rejects the malicious pack and says why', () => {
    expect(discovery.packs.has('mallory.evil-appearance/evil')).toBe(false);
    const rejected = discovery.rejected.find((r) => r.id === 'mallory.evil-appearance/evil');
    expect(rejected).toBeDefined();
    const text = formatRejection(rejected!);
    expect(text).toContain('forbidden construct @import');
    expect(text).toContain('selector ".card" is not allowed');
    expect(text).toContain('url(https://evil.example/pixel.png) must be a relative path');
    expect(text).toContain('logo.svg: contains <script>');
  });

  it('resolves the setting with a silent fallback for a missing pack', () => {
    expect(resolveAppearance('acme.acme-appearance/acme', discovery).pack?.label).toBe('Acme');
    expect(resolveAppearance(undefined, discovery)).toEqual({
      pack: undefined,
      fellBack: undefined,
    });
    expect(resolveAppearance('default', discovery)).toEqual({
      pack: undefined,
      fellBack: undefined,
    });
    expect(resolveAppearance('gone.pack/x', discovery)).toEqual({
      pack: undefined,
      fellBack: 'gone.pack/x',
    });
  });
});

describe('token preview', () => {
  const uris = {
    cspSource: 'vscode-webview://abc',
    tokensCss: 'vscode-webview://abc/tokens.css',
    previewCss: 'vscode-webview://abc/preview.css',
  };

  it('renders a strict CSP, every token, the card and the bubble', () => {
    const html = renderPreview(uris, previewModel(undefined), 'NONCE123');
    expect(html).toContain(
      `content="default-src 'none'; style-src vscode-webview://abc; script-src 'nonce-NONCE123'; img-src vscode-webview://abc data:; font-src vscode-webview://abc"`,
    );
    for (const name of TOKEN_NAMES) expect(html).toContain(`var(${name})`);
    expect(html).toContain('class="card"');
    expect(html).toContain('class="bubble"');
    expect(html).toContain('<script nonce="NONCE123">');
    expect(html).not.toContain('id="pack-css"');
  });

  it('escapes pack strings and links the pack css only when active', () => {
    const discovery = discoverPacks([ext('acme-appearance', 'acme')]);
    const pack = discovery.packs.get('acme.acme-appearance/acme')!;
    const model = previewModel({
      ...pack,
      label: '<img src=x onerror=alert(1)>',
      copy: { en: { tagline: 'a & b' } },
    });
    const html = renderPreview(
      {
        ...uris,
        packCss: 'vscode-webview://abc/pack.css',
        mascot: 'vscode-webview://abc/logo.svg',
      },
      model,
      'N',
    );
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('a &amp; b');
    expect(html).toContain(
      '<link id="pack-css" rel="stylesheet" href="vscode-webview://abc/pack.css">',
    );
    expect(html).toContain('<img class="mascot" alt="" src="vscode-webview://abc/logo.svg">');
  });

  it('cspFor and makeNonce', () => {
    expect(cspFor('s', 'n')).toBe(
      "default-src 'none'; style-src s; script-src 'nonce-n'; img-src s data:; font-src s",
    );
    expect(makeNonce(() => 0)).toBe('A'.repeat(32));
    expect(makeNonce()).toMatch(/^[A-Za-z0-9]{32}$/);
  });
});

describe('webview CSS rules', () => {
  const media = new URL('../media/', import.meta.url).pathname;

  it('component CSS has no color literals or font stacks; only tokens.css maps to the host theme', () => {
    const literal =
      /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|(?<=[:\s(,])(?:red|blue|green|white|black|gray|grey|orange|purple|pink|yellow)(?=[\s;),])/i;
    for (const file of readdirSync(media)) {
      const css = readFileSync(join(media, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(literal.test(css), `${file} must not contain color literals`).toBe(false);
      if (file !== 'tokens.css') {
        expect(
          css.includes('var(--vscode-'),
          `${file} must use --gl-* tokens, not --vscode-* directly`,
        ).toBe(false);
        expect(
          /font-family\s*:(?!\s*var\(--gl-)/.test(css),
          `${file} must not declare font stacks`,
        ).toBe(false);
      }
    }
  });

  it('contributed color ids have exactly one dot', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      contributes: { colors: { id: string; defaults: Record<string, string> }[] };
    };
    expect(pkg.contributes.colors.length).toBeGreaterThanOrEqual(19);
    for (const c of pkg.contributes.colors) {
      expect(c.id.split('.').length, c.id).toBe(2);
      expect(Object.keys(c.defaults).sort()).toEqual([
        'dark',
        'highContrast',
        'highContrastLight',
        'light',
      ]);
    }
    // Every accent token in tokens.css resolves to a contributed color.
    const tokens = readFileSync(join(media, 'tokens.css'), 'utf8');
    for (const m of tokens.matchAll(/--vscode-gitleaf-([A-Za-z0-9]+)/g)) {
      expect(
        pkg.contributes.colors.some((c) => c.id === `gitleaf.${m[1] ?? ''}`),
        `gitleaf.${m[1] ?? ''} must be contributed`,
      ).toBe(true);
    }
  });
});
