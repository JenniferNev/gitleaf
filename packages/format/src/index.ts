/**
 * Canonical Markdown/frontmatter format.
 *
 * - `parse(text)` splits frontmatter and body without changing a byte.
 * - `serialize(doc)` reproduces those bytes exactly.
 * - `update(doc, patch)` changes only the keys in the patch.
 * - `createDoc(body, frontmatter)` builds a new document in canonical form.
 *
 * Line endings: existing files keep their own (`\n` or `\r\n`); edits use the
 * file's own; new documents use `\n`. Bodies are never reflowed or re-indented.
 */
export { parse } from './parse.js';
export { serialize, createDoc, canonicalOrder } from './serialize.js';
export { update } from './update.js';
export { needsQuotes } from './scalars.js';
export type {
  DocMeta,
  FrontmatterPatch,
  FrontmatterValue,
  LineEnding,
  ParsedDoc,
} from './types.js';
