import { keyOrder, isSchemaId } from '@gitleaf/schema';
import { blockYaml } from './scalars.js';
import type { FrontmatterValue, ParsedDoc } from './types.js';

const DELIMITER = '---';

/** Reassembles the exact bytes `parse` saw. `serialize(parse(text)) === text` always holds. */
export function serialize(doc: ParsedDoc): string {
  const { meta } = doc;
  const bom = meta.bom ? '﻿' : '';
  if (!meta.hasFrontmatter) return bom + doc.body;
  return bom + DELIMITER + meta.eol + meta.frontmatterText + DELIMITER + meta.closeEol + doc.body;
}

/**
 * Orders keys the canonical way: the schema's property order first (chosen by
 * the `schema` marker, `gitleaf/doc@1` when absent), then any other keys in
 * their given order.
 */
export function canonicalOrder(
  frontmatter: Readonly<Record<string, FrontmatterValue>>,
): Readonly<Record<string, FrontmatterValue>> {
  const marker = frontmatter.schema;
  const order = keyOrder(
    typeof marker === 'string' && isSchemaId(marker) ? marker : 'gitleaf/doc@1',
  );
  const out: Record<string, FrontmatterValue> = {};
  for (const key of order)
    if (Object.hasOwn(frontmatter, key)) out[key] = frontmatter[key] as FrontmatterValue;
  for (const key of Object.keys(frontmatter))
    if (!Object.hasOwn(out, key)) out[key] = frontmatter[key] as FrontmatterValue;
  return out;
}

/**
 * Builds a new document: canonical key order, block-style YAML, LF line endings,
 * a trailing newline after the closing delimiter, gotcha strings quoted.
 * `frontmatter` may be omitted for a plain Markdown file.
 */
export function createDoc(
  body: string,
  frontmatter?: Readonly<Record<string, FrontmatterValue>>,
): ParsedDoc {
  if (frontmatter === undefined) {
    return {
      frontmatter: undefined,
      body,
      meta: { bom: false, eol: '\n', hasFrontmatter: false, frontmatterText: '', closeEol: '' },
    };
  }
  const ordered = canonicalOrder(frontmatter);
  const text = blockYaml(ordered);
  return {
    frontmatter: ordered,
    body,
    meta: { bom: false, eol: '\n', hasFrontmatter: true, frontmatterText: text, closeEol: '\n' },
  };
}
