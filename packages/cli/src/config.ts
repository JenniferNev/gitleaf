import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Diagnostic } from '@gitleaf/core';
import { validate, type GitleafConfig } from '@gitleaf/schema';
import { parse as parseYaml } from 'yaml';

export const CONFIG_FILE = 'gitleaf.yaml';

export interface LoadedConfig {
  /** Undefined when the config could not be loaded; `diagnostics` says why. */
  readonly config: GitleafConfig | undefined;
  /** Directory containing gitleaf.yaml: the current repository root. */
  readonly repoRoot: string;
  /** Absolute path of the config file, or undefined when defaults were used. */
  readonly configPath: string | undefined;
  readonly diagnostics: readonly Diagnostic[];
}

/** Walks up from `cwd` to find gitleaf.yaml. */
export function findConfig(cwd: string): string | undefined {
  let dir = resolve(cwd);
  for (;;) {
    const candidate = join(dir, CONFIG_FILE);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/**
 * Loads and validates gitleaf.yaml. Without one, a `docs/` folder under `cwd`
 * is used as the only root; otherwise loading fails with a diagnostic.
 */
export function loadConfig(cwd: string, explicitPath?: string): LoadedConfig {
  const configPath = explicitPath === undefined ? findConfig(cwd) : resolve(cwd, explicitPath);
  if (configPath === undefined || !existsSync(configPath)) {
    const repoRoot = resolve(cwd);
    if (configPath === undefined && existsSync(join(repoRoot, 'docs'))) {
      return {
        config: { schema: 'gitleaf/config@1', roots: [{ path: 'docs' }] },
        repoRoot,
        configPath: undefined,
        diagnostics: [],
      };
    }
    const message =
      configPath === undefined
        ? `no ${CONFIG_FILE} found from ${repoRoot} upwards and no docs/ folder`
        : `config file not found: ${configPath}`;
    return {
      config: undefined,
      repoRoot,
      configPath,
      diagnostics: [
        {
          repo: '.',
          path: CONFIG_FILE,
          line: 1,
          severity: 'error',
          rule: 'config/missing',
          message,
        },
      ],
    };
  }
  const repoRoot = dirname(configPath);
  const text = readFileSync(configPath, 'utf8');
  let data: unknown;
  try {
    data = parseYaml(text);
  } catch (error) {
    const message = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error);
    return fail(
      repoRoot,
      configPath,
      'config/yaml',
      `${CONFIG_FILE} is not valid YAML: ${message}`,
    );
  }
  const result = validate('gitleaf/config@1', data);
  if (!result.ok) {
    const diagnostics = result.issues.map((i) => ({
      repo: '.',
      path: CONFIG_FILE,
      line: lineOf(text, i.path),
      severity: 'error' as const,
      rule: 'config/schema',
      message: `${i.path === '' ? '' : `${i.path.slice(1).replaceAll('/', '.')} `}${i.message}`,
    }));
    return { config: undefined, repoRoot, configPath, diagnostics };
  }
  return { config: data as GitleafConfig, repoRoot, configPath, diagnostics: [] };
}

function fail(repoRoot: string, configPath: string, rule: string, message: string): LoadedConfig {
  return {
    config: undefined,
    repoRoot,
    configPath,
    diagnostics: [{ repo: '.', path: CONFIG_FILE, line: 1, severity: 'error', rule, message }],
  };
}

function lineOf(text: string, pointer: string): number {
  const key = pointer.split('/')[1];
  if (!key) return 1;
  const idx = text.split('\n').findIndex((l) => l.startsWith(`${key}:`));
  return idx === -1 ? 1 : idx + 1;
}
