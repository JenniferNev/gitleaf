/**
 * Appearance pack discovery and validation. Packs are VS Code extensions that
 * declare `contributes["gitleaf.appearances"]`. This module reads their
 * declared files, validates them with the rules in @gitleaf/core, and never
 * executes anything from a pack. The vscode API is injected so it can run in tests.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import {
  validateCopy,
  validateManifest,
  validateMascotMap,
  validateSvg,
  validateTokensCss,
  type AppearanceIssue,
  type AppearanceManifest,
} from '@gitleaf/core';

export const DEFAULT_APPEARANCE = 'default';
export const CONTRIBUTION = 'gitleaf.appearances';

/** The slice of `vscode.Extension` the loader needs. */
export interface ExtensionLike {
  readonly id: string;
  readonly extensionPath: string;
  readonly packageJSON: unknown;
}

export interface LoadedPack {
  /** Global id: `<publisher>.<name>/<id>`, as used by the gitleaf.appearance setting. */
  readonly id: string;
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly label: string;
  readonly description: string;
  /** Absolute path of the validated tokens CSS file. */
  readonly tokensPath: string;
  readonly tokensCss: string;
  readonly logoPath?: string;
  readonly mascot?: {
    readonly dir: string;
    readonly map: Readonly<Record<string, { face: string; voice?: string }>>;
  };
  readonly copy: Readonly<Record<string, Readonly<Record<string, string>>>>;
  /** Every file the pack may serve to a webview, absolute. */
  readonly files: readonly string[];
}

export interface RejectedPack {
  readonly id: string;
  readonly extensionId: string;
  readonly issues: readonly AppearanceIssue[];
}

export interface Discovery {
  readonly packs: ReadonlyMap<string, LoadedPack>;
  readonly rejected: readonly RejectedPack[];
}

function inside(root: string, path: string): string | undefined {
  const abs = resolve(root, path);
  return abs === root || abs.startsWith(root + sep) ? abs : undefined;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/** Loads one declared appearance from an extension, or returns why it was rejected. */
export function loadPack(ext: ExtensionLike, entry: unknown): LoadedPack | RejectedPack {
  const root = resolve(ext.extensionPath);
  const issues: AppearanceIssue[] = [...validateManifest(entry)];
  const m = entry as Partial<AppearanceManifest>;
  const localId = typeof m.id === 'string' ? m.id : '?';
  const id = `${ext.id}/${localId}`;
  const reject = (): RejectedPack => ({ id, extensionId: ext.id, issues });
  if (issues.length > 0) return reject();
  const manifest = m as AppearanceManifest;
  const files: string[] = [];

  const tokensPath = inside(root, manifest.tokens);
  let tokensCss = '';
  if (tokensPath === undefined || !existsSync(tokensPath)) {
    issues.push({ file: manifest.tokens, message: 'tokens file not found inside the extension' });
  } else {
    tokensCss = readFileSync(tokensPath, 'utf8');
    issues.push(...validateTokensCss(tokensCss, manifest.tokens));
    files.push(tokensPath);
    // Files referenced by url() are resolved relative to the tokens file and must exist.
    const tokensDir = resolve(tokensPath, '..');
    for (const u of tokensCss
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) {
      const target = inside(root, resolve(tokensDir, (u[2] ?? '').trim()).slice(root.length + 1));
      if (target === undefined || !existsSync(target))
        issues.push({
          file: manifest.tokens,
          message: `url(${u[2] ?? ''}) does not resolve inside the pack`,
        });
      else {
        if (target.toLowerCase().endsWith('.svg'))
          issues.push(...validateSvg(readFileSync(target, 'utf8'), u[2] ?? ''));
        files.push(target);
      }
    }
  }

  let logoPath: string | undefined;
  if (manifest.logo !== undefined) {
    logoPath = inside(root, manifest.logo);
    if (logoPath === undefined || !existsSync(logoPath))
      issues.push({ file: manifest.logo, message: 'logo not found inside the extension' });
    else {
      issues.push(...validateSvg(readFileSync(logoPath, 'utf8'), manifest.logo));
      files.push(logoPath);
    }
  }

  let mascot: LoadedPack['mascot'];
  if (manifest.mascot !== undefined) {
    const dir = inside(root, manifest.mascot.dir);
    const mapPath = inside(root, manifest.mascot.map);
    if (dir === undefined || !existsSync(dir) || !statSync(dir).isDirectory())
      issues.push({
        file: manifest.mascot.dir,
        message: 'mascot dir not found inside the extension',
      });
    else if (mapPath === undefined || !existsSync(mapPath))
      issues.push({
        file: manifest.mascot.map,
        message: 'mascot map not found inside the extension',
      });
    else {
      let map: unknown;
      try {
        map = readJson(mapPath);
      } catch (error) {
        issues.push({
          file: manifest.mascot.map,
          message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
      if (map !== undefined) {
        issues.push(...validateMascotMap(map, manifest.mascot.map));
        const faces = Object.values(map as Record<string, { face?: string }>)
          .map((e) => e.face)
          .filter((f): f is string => typeof f === 'string');
        for (const face of faces) {
          const facePath = inside(root, join(manifest.mascot.dir, face));
          if (facePath === undefined || !existsSync(facePath))
            issues.push({ file: face, message: 'mascot face not found in mascot dir' });
          else {
            issues.push(...validateSvg(readFileSync(facePath, 'utf8'), face));
            files.push(facePath);
          }
        }
        for (const f of readdirSync(dir))
          if (f.toLowerCase().endsWith('.svg')) files.push(join(dir, f));
        mascot = {
          dir,
          map: map as LoadedPack['mascot'] extends infer T
            ? T extends { map: infer M }
              ? M
              : never
            : never,
        };
      }
    }
  }

  const copy: Record<string, Readonly<Record<string, string>>> = {};
  for (const [lang, rel] of Object.entries(manifest.copy ?? {})) {
    const p = inside(root, rel);
    if (p === undefined || !existsSync(p)) {
      issues.push({ file: rel, message: `copy.${lang} not found inside the extension` });
      continue;
    }
    try {
      const value = readJson(p);
      const copyIssues = validateCopy(value, rel);
      issues.push(...copyIssues);
      if (copyIssues.length === 0) copy[lang] = value as Record<string, string>;
    } catch (error) {
      issues.push({
        file: rel,
        message: `not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  // Unknown mascot moments are warnings in spirit, but v1 keeps one rule: a pack is valid or rejected.
  if (issues.length > 0) return reject();
  return {
    id,
    extensionId: ext.id,
    extensionPath: root,
    label: manifest.label,
    description: manifest.description ?? '',
    tokensPath: tokensPath ?? '',
    tokensCss,
    ...(logoPath === undefined ? {} : { logoPath }),
    ...(mascot === undefined ? {} : { mascot }),
    copy,
    files: [...new Set(files)],
  };
}

/** Scans every extension for appearance contributions. Pure over the given list: no vscode import. */
export function discoverPacks(extensions: readonly ExtensionLike[]): Discovery {
  const packs = new Map<string, LoadedPack>();
  const rejected: RejectedPack[] = [];
  for (const ext of extensions) {
    const pkg = ext.packageJSON;
    if (typeof pkg !== 'object' || pkg === null) continue;
    const contributes = (pkg as { contributes?: unknown }).contributes;
    if (typeof contributes !== 'object' || contributes === null) continue;
    const entries = (contributes as Record<string, unknown>)[CONTRIBUTION];
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const result = loadPack(ext, entry);
      if ('issues' in result) rejected.push(result);
      else if (packs.has(result.id))
        rejected.push({
          id: result.id,
          extensionId: ext.id,
          issues: [{ file: 'package.json', message: 'duplicate appearance id' }],
        });
      else packs.set(result.id, result);
    }
  }
  return { packs, rejected };
}

/**
 * Resolves the `gitleaf.appearance` setting against the discovered packs.
 * Precedence is VS Code's own (user setting, then a pack's configurationDefaults,
 * then "default"); here only the fallback for a missing pack is decided.
 */
export function resolveAppearance(
  setting: string | undefined,
  discovery: Discovery,
): { pack: LoadedPack | undefined; fellBack: string | undefined } {
  const wanted = setting === undefined || setting === '' ? DEFAULT_APPEARANCE : setting;
  if (wanted === DEFAULT_APPEARANCE) return { pack: undefined, fellBack: undefined };
  const pack = discovery.packs.get(wanted);
  if (pack) return { pack, fellBack: undefined };
  return { pack: undefined, fellBack: wanted };
}

export function formatRejection(r: RejectedPack): string {
  return [
    `Appearance pack ${r.id} (from ${r.extensionId}) was rejected:`,
    ...r.issues.map((i) => `  ${i.file}: ${i.message}`),
  ].join('\n');
}
