import { existsSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { NodeWorkspaceStore } from '@gitleaf/adapter-fs-node';
import { GitCliVcs } from '@gitleaf/adapter-git-cli';
import type { Diagnostic, Repo } from '@gitleaf/core';
import { buildIndex, rootsOf, validateIndex, type DocIndex, type IndexedDoc } from '@gitleaf/index';
import type { GitleafConfig, Root } from '@gitleaf/schema';
import { loadConfig } from './config.js';

export interface ValidateOptions {
  readonly cwd: string;
  readonly paths: readonly string[];
  readonly configPath?: string | undefined;
  readonly now?: Date;
}

export interface ValidateReport {
  readonly files: number;
  readonly diagnostics: readonly (Diagnostic & { readonly file: string })[];
  readonly errors: number;
  readonly warnings: number;
}

/** Runs every docs-health rule over the workspace described by gitleaf.yaml. */
export async function runValidate(options: ValidateOptions): Promise<ValidateReport> {
  const loaded = loadConfig(options.cwd, options.configPath);
  const repos: Repo[] = [{ id: '.', rootPath: loaded.repoRoot }];
  const diagnostics: Diagnostic[] = [...loaded.diagnostics];
  const loadedConfig: GitleafConfig = loaded.config ?? {
    schema: 'gitleaf/config@1',
    roots: [{ path: '.', include: [] }],
  };

  for (const { repo } of rootsOf(loadedConfig)) {
    if (repo === '.' || repos.some((r) => r.id === repo)) continue;
    const rootPath = resolve(dirname(loaded.repoRoot), repo);
    if (!existsSync(rootPath)) {
      diagnostics.push({
        repo: '.',
        path: 'gitleaf.yaml',
        line: 1,
        severity: 'error',
        rule: 'config/repo-missing',
        message: `repository "${repo}" not found at ${rootPath}`,
      });
      continue;
    }
    repos.push({ id: repo, rootPath });
  }

  const store = new NodeWorkspaceStore(repos);
  const vcs = new GitCliVcs(repos);
  const usableRoots = loadedConfig.roots.filter((r) => repos.some((x) => x.id === (r.repo ?? '.')));
  const config: GitleafConfig = Object.assign({}, loadedConfig, {
    roots: usableRoots as [Root, ...Root[]],
  });
  const index: DocIndex =
    loaded.config !== undefined && usableRoots.length > 0
      ? await buildIndex(store, config)
      : { docs: [], paths: new Map(), byName: new Map() };

  const selected = selectDocs(index.docs, options, repos);
  const scoped = { ...index, docs: selected };
  const lastModified = async (doc: IndexedDoc): Promise<Date | undefined> =>
    (await vcs.lastModified(doc.repo, doc.path)) ?? (await store.stat(doc.repo, doc.path))?.mtime;
  diagnostics.push(
    ...(await validateIndex(scoped, config, {
      store,
      now: options.now ?? new Date(),
      lastModified,
    })),
  );

  const abs = (d: Diagnostic): string => {
    const repo = repos.find((r) => r.id === d.repo);
    return repo ? resolve(repo.rootPath, d.path) : d.path;
  };
  const withFiles = diagnostics.map((d) => ({ ...d, file: abs(d) }));
  return {
    files: selected.length,
    diagnostics: withFiles,
    errors: withFiles.filter((d) => d.severity === 'error').length,
    warnings: withFiles.filter((d) => d.severity === 'warning').length,
  };
}

/** Limits validation to docs under the given paths (relative to cwd), when any were given. */
function selectDocs(
  docs: readonly IndexedDoc[],
  options: ValidateOptions,
  repos: readonly Repo[],
): readonly IndexedDoc[] {
  if (options.paths.length === 0) return docs;
  const wanted = options.paths.map((p) => (isAbsolute(p) ? p : resolve(options.cwd, p)));
  return docs.filter((doc) => {
    const repo = repos.find((r) => r.id === doc.repo);
    if (!repo) return false;
    const file = resolve(repo.rootPath, doc.path);
    return wanted.some((w) => file === w || file.startsWith(w + sep));
  });
}

export interface Printer {
  readonly cwd: string;
  readonly color: boolean;
  readonly githubAnnotations: boolean;
}

const RED = '\u001b[31m';
const YELLOW = '\u001b[33m';
const RESET = '\u001b[0m';

/** `file:line: severity: message [rule]`, one per line, then a summary. */
export function formatText(report: ValidateReport, printer: Printer): string {
  const lines: string[] = [];
  for (const d of report.diagnostics) {
    const file = relative(printer.cwd, d.file) || d.file;
    const sev = printer.color
      ? `${d.severity === 'error' ? RED : YELLOW}${d.severity}${RESET}`
      : d.severity;
    const col = d.column === undefined ? '' : `:${String(d.column)}`;
    lines.push(`${file}:${String(d.line)}${col}: ${sev}: ${d.message} [${d.rule}]`);
    if (printer.githubAnnotations) {
      const kind = d.severity === 'error' ? 'error' : 'warning';
      const colPart = d.column === undefined ? '' : `,col=${String(d.column)}`;
      lines.push(
        `::${kind} file=${file},line=${String(d.line)}${colPart},title=${d.rule}::${d.message.replaceAll('%', '%25').replaceAll('\n', '%0A')}`,
      );
    }
  }
  lines.push(
    `gitleaf validate: ${String(report.files)} files, ${String(report.errors)} errors, ${String(report.warnings)} warnings`,
  );
  return `${lines.join('\n')}\n`;
}
