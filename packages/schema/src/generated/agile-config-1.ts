/* Generated from schemas/agile-config-1.schema.json by scripts/generate-types.ts. Do not edit. */

export type Status = string;

/**
 * agile/config.yaml: project key, id policy, workflow, estimation scale and sprint settings.
 */
export interface AgileConfigV1 {
  schema: 'gitleaf/agile-config@1';
  project: {
    key: string;
    name: string;
  };
  id?: {
    alphabet: 'crockford32';
    length: number;
  };
  workflow: {
    /**
     * @minItems 1
     */
    statuses: [Status, ...Status[]];
    /**
     * From status to the list of statuses it may move to.
     */
    transitions?: {
      /**
       * This interface was referenced by `undefined`'s JSON-Schema definition
       * via the `patternProperty` "^[a-z][a-z0-9-]*$".
       */
      [k: string]: Status[] | undefined;
    };
    wip_limits?: {
      /**
       * This interface was referenced by `undefined`'s JSON-Schema definition
       * via the `patternProperty` "^[a-z][a-z0-9-]*$".
       */
      [k: string]: number | undefined;
    };
  };
  estimation?: {
    /**
     * @minItems 1
     */
    scale: [number | string, ...(number | string)[]];
  };
  sprints?: {
    length_days: number;
    naming?: string;
  };
}
