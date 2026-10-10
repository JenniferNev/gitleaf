/**
 * The schema registry: every file format Gitleaf understands, keyed by its
 * `schema` marker (`gitleaf/<kind>@<version>`).
 */
import agileConfig1 from '../schemas/agile-config-1.schema.json' with { type: 'json' };
import config1 from '../schemas/config-1.schema.json' with { type: 'json' };
import doc1 from '../schemas/doc-1.schema.json' with { type: 'json' };
import item1 from '../schemas/item-1.schema.json' with { type: 'json' };

export type SchemaKind = 'doc' | 'config' | 'item' | 'agile-config';

export interface JsonSchema {
  readonly $id: string;
  readonly properties?: Readonly<Record<string, unknown>>;
  readonly [key: string]: unknown;
}

export const SCHEMAS = {
  'gitleaf/doc@1': doc1,
  'gitleaf/config@1': config1,
  'gitleaf/item@1': item1,
  'gitleaf/agile-config@1': agileConfig1,
} as const satisfies Readonly<Record<`gitleaf/${SchemaKind}@${number}`, JsonSchema>>;

/** A schema marker as written in files: `gitleaf/doc@1`. Only registered ids. */
export type SchemaId = keyof typeof SCHEMAS;

export const SCHEMA_IDS = Object.keys(SCHEMAS) as readonly SchemaId[];

const MARKER = /^gitleaf\/(doc|config|item|agile-config)@([1-9]\d*)$/;

export function parseSchemaId(marker: string): { kind: SchemaKind; version: number } | undefined {
  const m = MARKER.exec(marker);
  const kind = m?.[1];
  const version = m?.[2];
  if (kind === undefined || version === undefined) return undefined;
  return { kind: kind as SchemaKind, version: Number(version) };
}

export function isSchemaId(marker: string): marker is SchemaId {
  return Object.hasOwn(SCHEMAS, marker);
}

/**
 * Canonical frontmatter key order for a schema: the order of `properties` in
 * the schema file. The serializer (ST-96WHP0KK) writes keys in this order and
 * appends unknown `x-` keys after them, in their original order.
 */
export function keyOrder(id: SchemaId): readonly string[] {
  const schema: JsonSchema = SCHEMAS[id];
  return Object.keys(schema.properties ?? {});
}
