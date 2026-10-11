/**
 * Multi-repo doc index and docs-health rules: links and backlinks, wikilink
 * resolution, and the validation used by `gitleaf validate`.
 */
export { extractLinks, isLocal } from './links.js';
export type { Link, LinkKind } from './links.js';
export { buildIndex, docName, rootsOf, DEFAULT_INCLUDE } from './index-builder.js';
export type { DocIndex, IndexedDoc } from './index-builder.js';
export { validateIndex } from './validate.js';
export type { ValidateDeps } from './validate.js';
