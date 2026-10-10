/* Generated from schemas/item-1.schema.json by scripts/generate-types.ts. Do not edit. */

export type EntityId = string;

/**
 * One work item per file under agile/items/. Status lives here, never in the path. Key order in this schema is the canonical serialization order.
 */
export interface ItemV1 {
  schema: 'gitleaf/item@1';
  id: EntityId;
  type: 'epic' | 'story' | 'spike' | 'task' | 'bug';
  title: string;
  /**
   * Must be one of the statuses declared in agile/config.yaml. The default workflow is listed here.
   */
  status: 'backlog' | 'ready' | 'in-progress' | 'in-review' | 'done' | 'wont-do';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  epic?: EntityId;
  /**
   * Sprint name, for example 2026-S21. Membership lives on the item.
   */
  sprint?: string;
  /**
   * Estimate on the scale declared in agile/config.yaml.
   */
  points?: number | ('?' | 'coffee');
  depends_on?: EntityId[];
  labels?: string[];
  assignees?: string[];
  links?: {
    docs?: string[];
    prs?: string[];
    issues?: string[];
  };
  created: string;
  updated?: string;
}
