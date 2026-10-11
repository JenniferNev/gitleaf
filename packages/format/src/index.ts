/**
 * Canonical Markdown/frontmatter format.
 *
 * - `parse(text)` splits frontmatter and body without changing a byte.
 * - `serialize(doc)` reproduces those bytes exactly.
 * - `update(doc, patch)` changes only the keys in the patch.
 * - `createDoc(body, frontmatter)` builds a new document in canonical form.
 *
 * Line endings: `parse`/`serialize` keep a file's own (`\n` or `\r\n`) byte for
 * byte. Whatever Gitleaf writes (`update`, `createDoc`) uses `\n`, and the
 * frontmatter block is normalized on update. Bodies are never reflowed,
 * re-indented or re-encoded.
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
