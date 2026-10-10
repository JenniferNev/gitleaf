import { keyOrder, isSchemaId } from '@gitleaf/schema';
import { isMap, isPair, isScalar, parseDocument, type Pair } from 'yaml';
import { parse } from './parse.js';
import { inlineYaml } from './scalars.js';
import type { FrontmatterPatch, FrontmatterValue, ParsedDoc } from './types.js';

interface Span {
  readonly key: string;
  /** Offset of the first character of the key. */
  readonly start: number;
  /** Offset just past the value (before any trailing comment). */
  readonly valueEnd: number;
  /** Offset of the start of the value. Equals `valueEnd` when the value is empty. */
  readonly valueStart: number;
  readonly flow: boolean;
}

function spans(text: string): Span[] {
  const doc = parseDocument(text, { keepSourceTokens: true });
  if (doc.errors.length > 0)
    throw new Error(`frontmatter is not valid YAML: ${doc.errors[0]?.message ?? ''}`);
  if (doc.contents === null) return [];
  if (!isMap(doc.contents)) throw new Error('frontmatter must be a YAML mapping');
  const out: Span[] = [];
  for (const item of doc.contents.items) {
    if (!isPair(item)) continue;
    const pair: Pair = item;
    const key = pair.key;
    if (!isScalar(key) || key.range === null || key.range === undefined) continue;
    const name = String(key.value);
    const value = pair.value;
    if (value && typeof value === 'object' && 'range' in value && Array.isArray(value.range)) {
      const range = value.range as [number, number, number];
      const flow = 'flow' in value && value.flow === true;
      // Block collections report an end just past their final line break. Keep the break out of the value.
      let valueEnd = range[1];
      while (valueEnd > range[0] && (text[valueEnd - 1] === '\n' || text[valueEnd - 1] === '\r'))
        valueEnd--;
      out.push({ key: name, start: key.range[0], valueStart: range[0], valueEnd, flow });
    } else {
      // `key:` with no value: value starts and ends right after the colon.
      const colon = text.indexOf(':', key.range[1]);
      out.push({
        key: name,
        start: key.range[0],
        valueStart: colon + 1,
        valueEnd: colon + 1,
        flow: false,
      });
    }
  }
  return out;
}

function lineStart(text: string, offset: number): number {
  const i = text.lastIndexOf('\n', offset - 1);
  return i === -1 ? 0 : i + 1;
}

/** Offset just past the line break that ends the line containing `offset` (or text end). */
function lineEndInclusive(text: string, offset: number): number {
  const i = text.indexOf('\n', offset);
  if (i === -1) return text.length;
  return i + 1;
}

function replacementFor(value: FrontmatterValue, text: string, span: Span | undefined): string {
  const isCollection = Array.isArray(value) || (typeof value === 'object' && value !== null);
  if (!isCollection) return inlineYaml(value, false);
  // Keep the author's block style when the existing value is a block collection.
  const existingIsBlock =
    span !== undefined &&
    !span.flow &&
    span.valueStart !== span.valueEnd &&
    text.slice(span.valueStart, span.valueEnd).includes('\n');
  if (!existingIsBlock) return inlineYaml(value, true);
  const indent = ' '.repeat(span.valueStart - lineStart(text, span.valueStart));
  return inlineYaml(value, false)
    .split('\n')
    .map((line, i) => (i === 0 ? line : indent + line))
    .join('\n');
}

/**
 * Applies `patch` to a document's frontmatter, touching only the keys named in
 * it. Each changed scalar or flow value rewrites exactly its own bytes, a new
 * key adds one line at its canonical position, and `undefined` removes the
 * key's line(s). Every other byte of the frontmatter and body is unchanged.
 *
 * A document without frontmatter gains a canonical block when the patch sets a
 * key. Removing the last key leaves an empty block; the delimiters stay.
 */
export function update(doc: ParsedDoc, patch: FrontmatterPatch): ParsedDoc {
  const { meta } = doc;
  const eol = meta.eol;
  if (meta.frontmatterError !== undefined)
    throw new Error(`cannot update: ${meta.frontmatterError}`);
  let text = meta.hasFrontmatter ? meta.frontmatterText : '';

  for (const [key, value] of Object.entries(patch)) {
    const current = spans(text);
    const span = current.find((s) => s.key === key);
    if (value === undefined) {
      if (!span) continue;
      const from = lineStart(text, span.start);
      // Drop through the value's last line, including its line break and any trailing comment.
      const to = lineEndInclusive(text, Math.max(span.valueEnd, span.valueStart));
      text = text.slice(0, from) + text.slice(to);
      continue;
    }
    const rendered = replacementFor(value, text, span).replaceAll('\n', eol);
    if (span) {
      const sep = span.valueStart === span.valueEnd ? ' ' : '';
      text = text.slice(0, span.valueStart) + sep + rendered + text.slice(span.valueEnd);
      continue;
    }
    const line = `${key}: ${rendered}${eol}`;
    const at = insertionOffset(text, current, key);
    text = text.slice(0, at) + line + text.slice(at);
  }

  const assembled =
    '﻿'.repeat(meta.bom ? 1 : 0) +
    '---' +
    eol +
    text +
    '---' +
    (meta.hasFrontmatter ? meta.closeEol : eol) +
    doc.body;
  const result = parse(assembled);
  if (result.meta.frontmatterError !== undefined) {
    throw new Error(`update produced invalid YAML: ${result.meta.frontmatterError}`);
  }
  return result;
}

/** Where a new key goes: after the last present key that precedes it in canonical order, else at the end. */
function insertionOffset(text: string, current: readonly Span[], key: string): number {
  const markerSpan = current.find((s) => s.key === 'schema');
  const marker = markerSpan
    ? text
        .slice(markerSpan.valueStart, markerSpan.valueEnd)
        .trim()
        .replace(/^["']|["']$/g, '')
    : '';
  const order = keyOrder(isSchemaId(marker) ? marker : 'gitleaf/doc@1');
  const rank = (k: string): number => {
    const i = order.indexOf(k);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  const mine = rank(key);
  let after: Span | undefined;
  for (const s of current) if (rank(s.key) <= mine) after = s;
  if (!after) {
    const first = current[0];
    return first ? lineStart(text, first.start) : 0;
  }
  return lineEndInclusive(text, Math.max(after.valueEnd, after.valueStart));
}
