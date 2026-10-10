/**
 * JSON Schemas for every Gitleaf file format, the validator over them, and the
 * generated TypeScript types. Formats are the project's public API: see
 * .claude/rules/file-formats.md and packages/schema/migrations/README.md.
 */
export { SCHEMAS, SCHEMA_IDS, isSchemaId, keyOrder, parseSchemaId } from './registry.js';
export type { JsonSchema, SchemaId, SchemaKind } from './registry.js';
export { validate, validateByMarker } from './validate.js';
export type { ValidationIssue, ValidationResult } from './validate.js';
export type * from './generated/index.js';

import type { AgileConfigV1 } from './generated/agile-config-1.js';
import type { ConfigV1 } from './generated/config-1.js';
import type { DocV1 } from './generated/doc-1.js';
import type { ItemV1 } from './generated/item-1.js';

/** Extension keys every format allows. Gitleaf preserves them and never interprets them. */
export type Extensions = Readonly<Record<`x-${string}`, unknown>>;

/** `gitleaf/doc@1`: optional frontmatter of a Markdown doc. */
export type DocFrontmatter = Readonly<DocV1> & Extensions;
/** `gitleaf/config@1`: a repository's `gitleaf.yaml`. */
export type GitleafConfig = Readonly<ConfigV1> & Extensions;
/** `gitleaf/item@1`: frontmatter of an agile work item. */
export type ItemFrontmatter = Readonly<ItemV1> & Extensions;
/** `gitleaf/agile-config@1`: `agile/config.yaml`. */
export type AgileConfig = Readonly<AgileConfigV1> & Extensions;
