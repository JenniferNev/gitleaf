/**
 * Docs-health rules over a DocIndex. Every rule yields Diagnostics; none does I/O
 * beyond what the store and the injected callbacks provide.
 */
import { posix } from 'node:path';
import type { Diagnostic, Severity, WorkspaceStore } from '@gitleaf/core';
import type { GitleafConfig } from '@gitleaf/schema';
import { validateByMarker } from '@gitleaf/schema';
import type { DocIndex, IndexedDoc } from './index-builder.js';
import { isLocal } from './links.js';

export interface ValidateDeps {
  readonly store: WorkspaceStore;
  readonly now: Date;
  /** Last change date of a doc, from git when available, else the file system. */
  readonly lastModified: (doc: IndexedDoc) => Promise<Date | undefined>;
}

const SECRET_KEY =
  /(^|[_-])(token|secret|password|passwd|pwd|api[_-]?key|private[_-]?key|credentials?)($|[_-])/i;
const SECRET_REF = /^secret:\/\/[A-Za-z0-9._~!$&'()*+,;=:@/%-]+$/;
const DAY = 86_400_000;

function lineOfKey(doc: IndexedDoc, key: string): number {
  const fm = doc.doc.meta.frontmatterText;
  const lines = fm.split('\n');
  const idx = lines.findIndex((l) => l.startsWith(`${key}:`));
  // Line 1 is the opening `---`; frontmatter line n is file line n + 1.
  return idx === -1 ? 1 : idx + 2;
}

function diag(
  doc: IndexedDoc,
  rule: string,
  severity: Severity,
  message: string,
  line = 1,
  column?: number,
): Diagnostic {
  return {
    repo: doc.repo,
    path: doc.path,
    line,
    severity,
    rule,
    message,
    ...(column === undefined ? {} : { column }),
  };
}

function* frontmatterRules(doc: IndexedDoc, config: GitleafConfig): Generator<Diagnostic> {
  const { meta } = doc.doc;
  const rules = config.rules ?? {};
  if (meta.eol === '\r\n') {
    yield diag(
      doc,
      'format/line-endings',
      'warning',
      'file uses CRLF line endings; Gitleaf writes LF',
    );
  }
  if (!meta.hasFrontmatter) {
    if (rules.frontmatter === 'required')
      yield diag(doc, 'frontmatter/missing', 'error', 'frontmatter is required by gitleaf.yaml');
    if (rules.owners === 'required')
      yield diag(doc, 'owners/missing', 'error', 'owners are required by gitleaf.yaml');
    return;
  }
  if (meta.frontmatterError !== undefined) {
    const m = /line (\d+)/.exec(meta.frontmatterError);
    const line = m?.[1] !== undefined ? Number(m[1]) + 1 : 2;
    yield diag(
      doc,
      'frontmatter/yaml',
      'error',
      `frontmatter is not valid YAML: ${meta.frontmatterError.split('\n')[0] ?? ''}`,
      line,
    );
    return;
  }
  const fm = doc.doc.frontmatter ?? {};
  const result = validateByMarker(fm, 'gitleaf/doc@1');
  if (!result.ok) {
    for (const issue of result.issues) {
      const key =
        issue.path.split('/')[1] ??
        (issue.keyword === 'additionalProperties' ? unknownKey(issue.message) : '');
      const where =
        issue.path === '' ? '' : `${issue.path.replace(/^\//, '').replaceAll('/', '.')} `;
      yield diag(
        doc,
        'frontmatter/schema',
        'error',
        `${where}${issue.message}`,
        key ? lineOfKey(doc, key) : 2,
      );
    }
  }
  if (rules.owners === 'required') {
    const owners = fm.owners;
    if (!Array.isArray(owners) || owners.length === 0) {
      yield diag(
        doc,
        'owners/missing',
        'error',
        'owners are required by gitleaf.yaml',
        lineOfKey(doc, 'owners'),
      );
    }
  }
  yield* secretRules(doc, fm, '');
}

function unknownKey(message: string): string {
  return /unknown key "([^"]+)"/.exec(message)?.[1] ?? '';
}

function* secretRules(doc: IndexedDoc, value: unknown, path: string): Generator<Diagnostic> {
  if (typeof value === 'string') {
    const key = path.split('.').pop() ?? '';
    const top = path.split('.')[0] ?? '';
    if (value.startsWith('secret://') && !SECRET_REF.test(value)) {
      yield diag(
        doc,
        'secrets/malformed-ref',
        'error',
        `${path}: malformed secret:// reference`,
        lineOfKey(doc, top),
      );
    } else if (SECRET_KEY.test(key) && !value.startsWith('secret://')) {
      yield diag(
        doc,
        'secrets/value',
        'error',
        `${path}: a secret value where a secret:// reference is expected`,
        lineOfKey(doc, top),
      );
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const [i, v] of value.entries()) yield* secretRules(doc, v, `${path}[${String(i)}]`);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value))
      yield* secretRules(doc, v, path === '' ? k : `${path}.${k}`);
  }
}

function resolveRelative(doc: IndexedDoc, target: string): string | undefined {
  const base = posix.dirname(doc.path);
  const joined = target.startsWith('/')
    ? posix.normalize(target.slice(1))
    : posix.normalize(posix.join(base, target));
  if (joined === '..' || joined.startsWith('../')) return undefined;
  return joined;
}

async function* linkRules(
  doc: IndexedDoc,
  index: DocIndex,
  config: GitleafConfig,
  deps: ValidateDeps,
): AsyncGenerator<Diagnostic> {
  const mode = config.rules?.links ?? 'error';
  if (mode === 'off') return;
  const severity: Severity = mode === 'warn' ? 'warning' : 'error';
  for (const link of doc.links) {
    if (link.kind === 'wikilink') {
      const matches = index.byName.get(link.target.toLowerCase().replace(/\.md$/i, '')) ?? [];
      if (matches.length === 0) {
        yield diag(
          doc,
          'links/broken',
          severity,
          `wikilink [[${link.target}]] matches no doc`,
          link.line,
          link.column,
        );
      } else if (matches.length > 1) {
        const where = matches.map((m) => `${m.repo}:${m.path}`).join(', ');
        yield diag(
          doc,
          'links/ambiguous',
          'warning',
          `wikilink [[${link.target}]] matches ${String(matches.length)} docs: ${where}`,
          link.line,
          link.column,
        );
      }
      continue;
    }
    if (!isLocal(link.target)) continue;
    const resolved = resolveRelative(doc, decodeURIComponent(link.target));
    if (resolved === undefined) {
      yield diag(
        doc,
        'links/escapes-repo',
        severity,
        `link "${link.target}" leaves the repository`,
        link.line,
        link.column,
      );
      continue;
    }
    const known = index.paths.get(doc.repo)?.has(resolved) ?? false;
    if (!known && !(await deps.store.exists(doc.repo, resolved))) {
      yield diag(
        doc,
        'links/broken',
        severity,
        `broken link "${link.target}" (resolved to ${resolved})`,
        link.line,
        link.column,
      );
    }
  }
}

async function* freshnessRules(
  doc: IndexedDoc,
  config: GitleafConfig,
  deps: ValidateDeps,
): AsyncGenerator<Diagnostic> {
  const days = config.rules?.stale_after_days ?? 0;
  const fm = doc.doc.frontmatter ?? {};
  if (typeof fm.review_by === 'string') {
    const due = new Date(fm.review_by);
    if (!Number.isNaN(due.getTime()) && due.getTime() < deps.now.getTime()) {
      yield diag(
        doc,
        'docs/review-overdue',
        'warning',
        `review_by ${fm.review_by} has passed`,
        lineOfKey(doc, 'review_by'),
      );
    }
  }
  if (days > 0 && fm.status !== 'archived') {
    const last = await deps.lastModified(doc);
    if (last !== undefined) {
      const age = Math.floor((deps.now.getTime() - last.getTime()) / DAY);
      if (age > days)
        yield diag(
          doc,
          'docs/stale',
          'warning',
          `not changed in ${String(age)} days (limit ${String(days)})`,
        );
    }
  }
}

function* idRules(index: DocIndex): Generator<Diagnostic> {
  const seen = new Map<string, IndexedDoc[]>();
  for (const doc of index.docs) {
    const id = doc.doc.frontmatter?.id;
    if (typeof id !== 'string') continue;
    let list = seen.get(id);
    if (!list) seen.set(id, (list = []));
    list.push(doc);
  }
  for (const [id, docs] of seen) {
    if (docs.length < 2) continue;
    for (const doc of docs) {
      const others = docs
        .filter((d) => d !== doc)
        .map((d) => `${d.repo}:${d.path}`)
        .join(', ');
      yield diag(
        doc,
        'ids/duplicate',
        'error',
        `id ${id} is also used by ${others}`,
        lineOfKey(doc, 'id'),
      );
    }
  }
}

/** Runs every rule and returns diagnostics sorted by repo, path, line, column. */
export async function validateIndex(
  index: DocIndex,
  config: GitleafConfig,
  deps: ValidateDeps,
): Promise<readonly Diagnostic[]> {
  const out: Diagnostic[] = [];
  for (const doc of index.docs) {
    out.push(...frontmatterRules(doc, config));
    for await (const d of linkRules(doc, index, config, deps)) out.push(d);
    for await (const d of freshnessRules(doc, config, deps)) out.push(d);
  }
  out.push(...idRules(index));
  return out.sort(
    (a, b) =>
      a.repo.localeCompare(b.repo) ||
      a.path.localeCompare(b.path) ||
      a.line - b.line ||
      (a.column ?? 0) - (b.column ?? 0) ||
      a.rule.localeCompare(b.rule),
  );
}
