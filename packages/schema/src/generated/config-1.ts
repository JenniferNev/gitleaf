/* Generated from schemas/config-1.schema.json by scripts/generate-types.ts. Do not edit. */

/**
 * A path relative to the repository root, with forward slashes, no leading slash and no '..' segments.
 */
export type RelativePath = string;
/**
 * A reference to a secret in an external store. Never a value.
 */
export type SecretRef = string;

/**
 * Workspace configuration at a repository root. Declares doc roots across repos, rules, forge settings and secret backends. Holds secret:// references only, never values.
 */
export interface ConfigV1 {
  schema: 'gitleaf/config@1';
  /**
   * Where docs live. Each root is a folder, optionally in another repository.
   *
   * @minItems 1
   */
  roots: [Root, ...Root[]];
  rules?: Rules;
  forge?: Forge;
  secrets?: Secrets;
  /**
   * Hints only. The user's gitleaf.appearance setting and installed packs decide.
   */
  appearance?: {
    suggest?: string;
  };
}
export interface Root {
  path: RelativePath;
  /**
   * Another repository holding this root: a path relative to this repo's parent folder, or a workspace folder name. Omit for this repository.
   */
  repo?: string;
  /**
   * Display name for this root in the docs explorer.
   */
  name?: string;
  include?: string[];
  exclude?: string[];
}
export interface Rules {
  /**
   * Whether every doc must declare owners in its frontmatter.
   */
  owners?: 'required' | 'optional';
  /**
   * A doc with no change for this many days is reported as stale. 0 disables the check.
   */
  stale_after_days?: number;
  /**
   * Whether every doc must have frontmatter.
   */
  frontmatter?: 'required' | 'optional';
  /**
   * Whether broken relative links and wikilinks are errors, warnings or ignored.
   */
  links?: 'error' | 'warn' | 'off';
}
/**
 * Where pull requests live. Credentials are references only.
 */
export interface Forge {
  kind: 'github' | 'azure-devops' | 'gitlab';
  /**
   * Repository URL on GitHub or GitLab, or the project URL on Azure DevOps.
   */
  url: string;
  token?: SecretRef;
}
/**
 * Which external store the secret:// references resolve against. Metadata only.
 */
export interface Secrets {
  backend: 'infisical' | 'openbao' | 'sops';
  url?: string;
  project?: string;
  /**
   * For sops: the relative path of the private secrets repo or file.
   */
  path?: string;
  token?: SecretRef;
}
