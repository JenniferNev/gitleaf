import { Ajv2020, type ErrorObject, type ValidateFunction } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';

// ajv-formats is CommonJS; under Node ESM the plugin is both the module and its `default`.
const addFormats = addFormatsModule.default;
import { isSchemaId, SCHEMAS, type JsonSchema, type SchemaId } from './registry.js';

export interface ValidationIssue {
  /** JSON pointer-ish path inside the document, `/owners/0`. Empty string is the root. */
  readonly path: string;
  readonly message: string;
  readonly keyword: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly issues: readonly [] }
  | { readonly ok: false; readonly issues: readonly ValidationIssue[] };

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  allowUnionTypes: true,
  // Values are reported back to humans; never coerce or mutate what came from a file.
  coerceTypes: false,
  useDefaults: false,
  removeAdditional: false,
});
addFormats(ajv);
for (const schema of Object.values(SCHEMAS) as JsonSchema[]) ajv.addSchema(schema);

const compiled = new Map<SchemaId, ValidateFunction>();

function validatorFor(id: SchemaId): ValidateFunction {
  let fn = compiled.get(id);
  if (!fn) {
    const schema: JsonSchema = SCHEMAS[id];
    fn = ajv.getSchema(schema.$id);
    if (!fn) throw new Error(`schema not registered: ${id}`);
    compiled.set(id, fn);
  }
  return fn;
}

function toIssue(error: ErrorObject): ValidationIssue {
  let message = error.message ?? error.keyword;
  if (error.keyword === 'additionalProperties') {
    const extra = (error.params as { additionalProperty?: string }).additionalProperty;
    message = `unknown key "${extra ?? '?'}" (only x- keys may be added)`;
  } else if (error.keyword === 'enum') {
    const allowed = (error.params as { allowedValues?: unknown[] }).allowedValues ?? [];
    message = `must be one of ${allowed.map((v) => JSON.stringify(v)).join(', ')}`;
  } else if (error.keyword === 'const') {
    message = `must be ${JSON.stringify((error.params as { allowedValue?: unknown }).allowedValue)}`;
  }
  return { path: error.instancePath, message, keyword: error.keyword };
}

/** Validates `data` against a registered schema. Never throws for invalid data. */
export function validate(id: SchemaId, data: unknown): ValidationResult {
  const fn = validatorFor(id);
  if (fn(data)) return { ok: true, issues: [] };
  const issues = (fn.errors ?? []).map(toIssue);
  return { ok: false, issues };
}

/**
 * Picks the schema from the document's own `schema` marker, or from `fallback`
 * when the marker is absent (docs may omit it).
 */
export function validateByMarker(data: unknown, fallback: SchemaId): ValidationResult {
  const marker =
    typeof data === 'object' && data !== null && 'schema' in data ? data.schema : undefined;
  if (marker === undefined) return validate(fallback, data);
  if (typeof marker !== 'string' || !isSchemaId(marker)) {
    return {
      ok: false,
      issues: [
        {
          path: '/schema',
          message: `unknown schema ${JSON.stringify(marker)}; known: ${Object.keys(SCHEMAS).join(', ')}`,
          keyword: 'schema',
        },
      ],
    };
  }
  return validate(marker, data);
}
