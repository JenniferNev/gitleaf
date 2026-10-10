import { isMap, parseDocument } from 'yaml';
import type { DocMeta, LineEnding, ParsedDoc } from './types.js';

const BOM = '﻿';
const DELIMITER = '---';

function detectEol(text: string): LineEnding {
  const lf = text.indexOf('\n');
  if (lf === -1) return '\n';
  return lf > 0 && text[lf - 1] === '\r' ? '\r\n' : '\n';
}

/**
 * Splits a Markdown text into frontmatter and body without changing a byte.
 *
 * Frontmatter is present only when the text (after an optional BOM) starts with
 * a line that is exactly `---` and a later line is exactly `---`. Anything else
 * is a body with no frontmatter. The closing line's own line break belongs to
 * the frontmatter; the body starts right after it.
 */
export function parse(text: string): ParsedDoc {
  const bom = text.startsWith(BOM);
  const src = bom ? text.slice(BOM.length) : text;
  const eol = detectEol(src);

  const noFrontmatter = (): ParsedDoc => ({
    frontmatter: undefined,
    body: src,
    meta: { bom, eol, hasFrontmatter: false, frontmatterText: '', closeEol: '' },
  });

  const open = DELIMITER + eol;
  if (!src.startsWith(open)) return noFrontmatter();

  const fmStart = open.length;
  let pos = fmStart;
  for (;;) {
    const lineEnd = src.indexOf(eol, pos);
    const line = lineEnd === -1 ? src.slice(pos) : src.slice(pos, lineEnd);
    if (line === DELIMITER) {
      const frontmatterText = src.slice(fmStart, pos);
      const closeEol: LineEnding | '' = lineEnd === -1 ? '' : eol;
      const body = lineEnd === -1 ? '' : src.slice(lineEnd + eol.length);
      const meta: DocMeta = { bom, eol, hasFrontmatter: true, frontmatterText, closeEol };
      return { ...parseFrontmatter(frontmatterText, meta), body };
    }
    if (lineEnd === -1) return noFrontmatter();
    pos = lineEnd + eol.length;
  }
}

function parseFrontmatter(
  text: string,
  meta: DocMeta,
): { frontmatter: ParsedDoc['frontmatter']; meta: DocMeta } {
  if (text.trim() === '') return { frontmatter: {}, meta };
  const doc = parseDocument(text, { keepSourceTokens: true, prettyErrors: true });
  const error = doc.errors[0];
  if (error) return { frontmatter: undefined, meta: { ...meta, frontmatterError: error.message } };
  if (!isMap(doc.contents)) {
    return {
      frontmatter: undefined,
      meta: { ...meta, frontmatterError: 'frontmatter must be a YAML mapping' },
    };
  }
  const value: unknown = doc.toJS({ mapAsMap: false });
  return { frontmatter: value as Record<string, unknown>, meta };
}
