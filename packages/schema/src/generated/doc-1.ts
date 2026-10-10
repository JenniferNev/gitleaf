/* Generated from schemas/doc-1.schema.json by scripts/generate-types.ts. Do not edit. */

/**
 * Optional YAML frontmatter of a Markdown doc. Key order in this schema is the canonical serialization order. Unknown keys are allowed only under the x- prefix.
 */
export interface DocV1 {
  /**
   * Schema marker. Optional for docs; when present it must be gitleaf/doc@1.
   */
  schema?: 'gitleaf/doc@1';
  /**
   * Stable identity that survives file moves. <TYPE>-<8 Crockford base32 chars>.
   */
  id?: string;
  title?: string;
  /**
   * People or teams responsible for the doc. Handles, emails or team names.
   *
   * @minItems 1
   */
  owners?: [string, ...string[]];
  status?: 'draft' | 'in-review' | 'published' | 'archived';
  tags?: string[];
  /**
   * Date (YYYY-MM-DD) after which the doc counts as stale unless reviewed.
   */
  review_by?: string;
}
