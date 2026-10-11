/**
 * Appearance packs: declarative restyling of Gitleaf webviews. Packs are data,
 * never code. This module validates a pack's tokens CSS, SVG assets and copy
 * against the allowlist in docs/design/appearance-packs.md. Pure: no I/O.
 */

export interface AppearanceManifest {
  /** Unique within the pack. The global id is `<publisher>.<extension>/<id>`. */
  readonly id: string;
  readonly label: string;
  readonly description?: string;
  /** Path of the tokens CSS file, relative to the extension root. Required. */
  readonly tokens: string;
  readonly mascot?: { readonly dir: string; readonly map: string };
  readonly copy?: Readonly<Record<string, string>>;
  readonly logo?: string;
}

export interface AppearanceIssue {
  readonly file: string;
  readonly message: string;
}

export interface AppearanceValidation {
  readonly ok: boolean;
  readonly issues: readonly AppearanceIssue[];
}

/** Selectors a pack may use. Anything else is rejected. */
export const ALLOWED_SELECTORS: readonly string[] = [
  ':root',
  'body.vscode-light',
  'body.vscode-dark',
  'body.vscode-high-contrast',
];

/** Moments where a mascot may appear. Errors, security, secrets and permission prompts are never on this list. */
export const MASCOT_MOMENTS: readonly string[] = [
  'walkthrough-welcome',
  'empty-docs',
  'no-results',
  'waiting-for-review',
  'review-approved',
  'doc-merged',
  'merge-conflict',
  'validation-summary',
  'broken-links',
  'agent-draft-ready',
  'poker-outlier',
  'poker-consensus',
];

const FORBIDDEN_CSS = [
  /@import\b/i,
  /expression\s*\(/i,
  /-moz-binding/i,
  /\bbehavior\s*:/i,
  /javascript\s*:/i,
  /@charset/i,
  /<\/?script/i,
];
const URL_CALL = /url\(\s*(['"]?)([^'")]*)\1\s*\)/gi;

/**
 * True when a `url()` or manifest target is a relative path: no scheme, not
 * absolute, not protocol-relative. `..` segments are allowed here because the
 * loader resolves every path and rejects anything outside the extension.
 */
export function isPackRelativeUrl(target: string): boolean {
  const t = target.trim();
  if (t === '' || t.startsWith('/') || t.startsWith('\\') || t.startsWith('#')) return false;
  return !/^[a-z][a-z0-9+.-]*:/i.test(t);
}

/**
 * Validates tokens CSS: only allowed selectors, only `--gl-*` declarations,
 * only pack-relative `url()`s, none of the dangerous constructs.
 */
export function validateTokensCss(css: string, file = 'tokens.css'): readonly AppearanceIssue[] {
  const issues: AppearanceIssue[] = [];
  for (const re of FORBIDDEN_CSS) {
    if (re.test(css)) issues.push({ file, message: `forbidden construct ${re.source}` });
  }
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of stripped.matchAll(URL_CALL)) {
    const target = m[2] ?? '';
    if (!isPackRelativeUrl(target))
      issues.push({ file, message: `url(${target}) must be a relative path inside the pack` });
  }
  // Blocks: selector { declarations }
  let depth = 0;
  let cursor = 0;
  let selectorStart = 0;
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === '{') {
      if (depth === 0) {
        // The selector is whatever follows the last statement terminator before this block.
        const selector = stripped.slice(selectorStart, i).split(';').pop()?.trim() ?? '';
        const names = selector.split(',').map((s) => s.trim());
        for (const name of names) {
          if (!ALLOWED_SELECTORS.includes(name))
            issues.push({
              file,
              message: `selector "${name}" is not allowed (use ${ALLOWED_SELECTORS.join(', ')})`,
            });
        }
        cursor = i + 1;
      }
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0) {
        issues.push(...validateDeclarations(stripped.slice(cursor, i), file));
        selectorStart = i + 1;
      } else if (depth < 0) {
        issues.push({ file, message: 'unbalanced braces' });
        depth = 0;
      }
    }
  }
  if (depth !== 0) issues.push({ file, message: 'unbalanced braces' });
  const tail = stripped.slice(selectorStart).trim();
  if (tail !== '')
    issues.push({ file, message: `declarations outside a block: "${tail.slice(0, 40)}"` });
  return issues;
}

function validateDeclarations(block: string, file: string): AppearanceIssue[] {
  const issues: AppearanceIssue[] = [];
  for (const raw of block.split(';')) {
    const decl = raw.trim();
    if (decl === '') continue;
    const colon = decl.indexOf(':');
    const name = colon === -1 ? decl : decl.slice(0, colon).trim();
    if (!name.startsWith('--gl-'))
      issues.push({ file, message: `"${name}" is not a --gl-* custom property` });
  }
  return issues;
}

const SVG_FORBIDDEN: readonly { re: RegExp; what: string }[] = [
  { re: /<script[\s>/]/i, what: '<script>' },
  { re: /<foreignObject[\s>/]/i, what: '<foreignObject>' },
  { re: /\son[a-z]+\s*=/i, what: 'on* event attribute' },
  {
    re: /\b(?:xlink:)?href\s*=\s*["']\s*(?:https?:|\/\/|javascript:|data:text\/html)/i,
    what: 'external or script href',
  },
  { re: /<!ENTITY/i, what: 'entity declaration' },
];

/** Rejects SVG with scripts, event handlers, foreign objects or external references. */
export function validateSvg(svg: string, file: string): readonly AppearanceIssue[] {
  const issues: AppearanceIssue[] = [];
  if (!/<svg[\s>]/i.test(svg)) issues.push({ file, message: 'not an SVG document' });
  for (const { re, what } of SVG_FORBIDDEN)
    if (re.test(svg)) issues.push({ file, message: `contains ${what}` });
  return issues;
}

/** Copy files are flat string maps. HTML is escaped at render time, so only the shape is checked here. */
export function validateCopy(value: unknown, file: string): readonly AppearanceIssue[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return [{ file, message: 'copy must be a JSON object of strings' }];
  const issues: AppearanceIssue[] = [];
  for (const [k, v] of Object.entries(value)) {
    if (typeof v !== 'string') issues.push({ file, message: `"${k}" must be a string` });
  }
  return issues;
}

/** A mascot map pairs moments with a face file and optional voice line. Unknown moments are ignored by Gitleaf but reported. */
export function validateMascotMap(value: unknown, file: string): readonly AppearanceIssue[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return [{ file, message: 'mascot map must be a JSON object' }];
  const issues: AppearanceIssue[] = [];
  for (const [moment, entry] of Object.entries(value)) {
    if (!MASCOT_MOMENTS.includes(moment))
      issues.push({
        file,
        message: `moment "${moment}" is not one Gitleaf shows a mascot for; it will be ignored`,
      });
    if (typeof entry !== 'object' || entry === null) {
      issues.push({ file, message: `"${moment}" must be an object with face and optional voice` });
      continue;
    }
    const e = entry as { face?: unknown; voice?: unknown };
    if (typeof e.face !== 'string' || !isPackRelativeUrl(e.face))
      issues.push({ file, message: `"${moment}".face must be a relative SVG path` });
    if (e.voice !== undefined && typeof e.voice !== 'string')
      issues.push({ file, message: `"${moment}".voice must be a string` });
  }
  return issues;
}

export function validateManifest(value: unknown): readonly AppearanceIssue[] {
  const file = 'package.json';
  if (typeof value !== 'object' || value === null)
    return [{ file, message: 'appearance entry must be an object' }];
  const m = value as Partial<AppearanceManifest>;
  const issues: AppearanceIssue[] = [];
  if (typeof m.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(m.id))
    issues.push({ file, message: 'id must match ^[a-z][a-z0-9-]*$' });
  if (typeof m.label !== 'string' || m.label === '')
    issues.push({ file, message: 'label is required' });
  if (typeof m.tokens !== 'string' || !isPackRelativeUrl(m.tokens) || !m.tokens.endsWith('.css'))
    issues.push({ file, message: 'tokens must be a relative .css path' });
  if (
    m.mascot !== undefined &&
    (typeof m.mascot.dir !== 'string' || typeof m.mascot.map !== 'string')
  )
    issues.push({ file, message: 'mascot needs dir and map' });
  if (m.logo !== undefined && (!isPackRelativeUrl(m.logo) || !m.logo.endsWith('.svg')))
    issues.push({ file, message: 'logo must be a relative .svg path' });
  if (m.copy !== undefined) {
    for (const [lang, path] of Object.entries(m.copy)) {
      if (
        !/^[a-z]{2}(-[A-Z]{2})?$/.test(lang) ||
        typeof path !== 'string' ||
        !isPackRelativeUrl(path)
      )
        issues.push({
          file,
          message: `copy.${lang} must map a language code to a relative .json path`,
        });
    }
  }
  return issues;
}

/** Escapes text for HTML. Copy strings and anything from a workspace file go through this before rendering. */
export function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  );
}
