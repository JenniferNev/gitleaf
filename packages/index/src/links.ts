/**
 * Link extraction from Markdown text. Pure: no I/O.
 * Finds inline links and images, reference definitions and wikilinks, and
 * skips fenced code blocks and inline code spans.
 */

export type LinkKind = 'markdown' | 'image' | 'reference' | 'wikilink';

export interface Link {
  /** The target as written, without a `#fragment` or `?query`. */
  readonly target: string;
  readonly fragment?: string;
  readonly kind: LinkKind;
  /** 1-based line of the link target. */
  readonly line: number;
  /** 1-based column of the link target. */
  readonly column: number;
}

const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const INLINE =
  /(!?)\[(?:[^[\]]|\[[^[\]]*\])*\]\(\s*(<[^>]*>|[^\s)]+)(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
const REFERENCE = /^\s{0,3}\[[^\]]+\]:\s*(<[^>]*>|\S+)/;
const WIKILINK = /\[\[([^\]|#]+)(?:#([^\]|]*))?(?:\|[^\]]*)?\]\]/g;
const FENCE = /^\s{0,3}(```|~~~)/;

function stripCode(line: string): string {
  // Replace inline code spans with spaces of the same length so columns stay right.
  return line.replace(/(`+)[^`]*?\1/g, (m) => ' '.repeat(m.length));
}

function split(raw: string): { target: string; fragment?: string } {
  const t = raw.startsWith('<') && raw.endsWith('>') ? raw.slice(1, -1) : raw;
  const h = t.indexOf('#');
  const fragment = h === -1 ? undefined : t.slice(h + 1);
  let target = h === -1 ? t : t.slice(0, h);
  const q = target.indexOf('?');
  if (q !== -1) target = target.slice(0, q);
  return fragment === undefined ? { target } : { target, fragment };
}

/** True when a target points inside the workspace rather than to the web, mail or an anchor. */
export function isLocal(target: string): boolean {
  return target !== '' && !SCHEME.test(target) && !target.startsWith('//');
}

export function extractLinks(text: string): readonly Link[] {
  const out: Link[] = [];
  const lines = text.split('\n');
  let fence: string | undefined;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? '';
    const fenceMatch = FENCE.exec(raw);
    if (fenceMatch) {
      const marker = fenceMatch[1] ?? '';
      if (fence === undefined) fence = marker;
      else if (marker === fence) fence = undefined;
      continue;
    }
    if (fence !== undefined) continue;
    const line = stripCode(raw);
    const lineNo = i + 1;

    const ref = REFERENCE.exec(line);
    if (ref?.[1] !== undefined) {
      const col = line.indexOf(ref[1], ref.index) + 1;
      out.push({ ...split(ref[1]), kind: 'reference', line: lineNo, column: col });
      continue;
    }
    for (const m of line.matchAll(INLINE)) {
      const rawTarget = m[2] ?? '';
      const col = m.index + m[0].indexOf(rawTarget, m[0].indexOf('](') + 2) + 1;
      out.push({
        ...split(rawTarget),
        kind: m[1] === '!' ? 'image' : 'markdown',
        line: lineNo,
        column: col,
      });
    }
    for (const m of line.matchAll(WIKILINK)) {
      const target = (m[1] ?? '').trim();
      const fragment = m[2];
      out.push({
        target,
        ...(fragment !== undefined && fragment !== '' ? { fragment } : {}),
        kind: 'wikilink',
        line: lineNo,
        column: m.index + 3,
      });
    }
  }
  return out;
}
