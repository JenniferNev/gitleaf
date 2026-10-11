/**
 * Pure view models for the Docs tree and the Problems panel. No vscode import,
 * so they are unit-tested directly.
 */
import type { Diagnostic } from '@gitleaf/core';
import type { DocIndex, IndexedDoc } from '@gitleaf/index';

export interface RootNode {
  readonly kind: 'root';
  readonly key: string;
  readonly repo: string;
  readonly path: string;
  readonly label: string;
  readonly description: string;
}

export interface FolderNode {
  readonly kind: 'folder';
  readonly key: string;
  readonly repo: string;
  readonly path: string;
  readonly label: string;
}

export interface DocNode {
  readonly kind: 'doc';
  readonly key: string;
  readonly repo: string;
  readonly path: string;
  readonly label: string;
  readonly description: string;
  readonly status?: string;
  readonly owners: readonly string[];
  readonly problems: number;
}

export type TreeNode = RootNode | FolderNode | DocNode;

export function titleOf(doc: IndexedDoc): string {
  const fm = doc.doc.frontmatter;
  if (fm && typeof fm.title === 'string' && fm.title !== '') return fm.title;
  const heading = /^#\s+(.+)$/m.exec(doc.doc.body);
  if (heading?.[1]) return heading[1].trim();
  return doc.path.slice(doc.path.lastIndexOf('/') + 1);
}

function describe(doc: IndexedDoc, problems: number): string {
  const fm = doc.doc.frontmatter ?? {};
  const parts: string[] = [];
  if (typeof fm.status === 'string') parts.push(fm.status);
  if (Array.isArray(fm.owners) && fm.owners.length > 0)
    parts.push(fm.owners.map(String).join(', '));
  if (problems > 0) parts.push(`${String(problems)} problem${problems === 1 ? '' : 's'}`);
  return parts.join(' · ');
}

/** Roots of the tree: one node per configured root, labelled by name or path. */
export function rootNodes(
  roots: readonly { repo: string; path: string; name?: string | undefined }[],
  repoLabel: (repo: string) => string,
): RootNode[] {
  return roots.map((r) => ({
    kind: 'root',
    key: `${r.repo}:${r.path}`,
    repo: r.repo,
    path: r.path,
    label: r.name ?? r.path,
    description: r.repo === '.' ? r.path : `${repoLabel(r.repo)} · ${r.path}`,
  }));
}

/** Children of a root or folder: subfolders first, then docs, both sorted. */
export function childNodes(
  index: DocIndex,
  parent: RootNode | FolderNode,
  problemsByDoc: ReadonlyMap<string, number>,
): TreeNode[] {
  const prefix = `${parent.path}/`;
  const folders = new Map<string, FolderNode>();
  const docs: DocNode[] = [];
  for (const doc of index.docs) {
    if (doc.repo !== parent.repo || !doc.path.startsWith(prefix)) continue;
    const rest = doc.path.slice(prefix.length);
    const slash = rest.indexOf('/');
    if (slash !== -1) {
      const name = rest.slice(0, slash);
      const path = `${parent.path}/${name}`;
      if (!folders.has(path))
        folders.set(path, {
          kind: 'folder',
          key: `${parent.repo}:${path}`,
          repo: parent.repo,
          path,
          label: name,
        });
      continue;
    }
    const problems = problemsByDoc.get(`${doc.repo}:${doc.path}`) ?? 0;
    const fm = doc.doc.frontmatter ?? {};
    docs.push({
      kind: 'doc',
      key: `${doc.repo}:${doc.path}`,
      repo: doc.repo,
      path: doc.path,
      label: titleOf(doc),
      description: describe(doc, problems),
      ...(typeof fm.status === 'string' ? { status: fm.status } : {}),
      owners: Array.isArray(fm.owners) ? fm.owners.map(String) : [],
      problems,
    });
  }
  const sortedFolders = [...folders.values()].sort((a, b) => a.label.localeCompare(b.label));
  docs.sort((a, b) => a.label.localeCompare(b.label));
  return [...sortedFolders, ...docs];
}

export function countProblems(diagnostics: readonly Diagnostic[]): ReadonlyMap<string, number> {
  const out = new Map<string, number>();
  for (const d of diagnostics) {
    const key = `${d.repo}:${d.path}`;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  return out;
}

/** Groups diagnostics by absolute file so they can be published per URI. */
export function groupByFile(
  diagnostics: readonly Diagnostic[],
  absolute: (repo: string, path: string) => string,
): ReadonlyMap<string, readonly Diagnostic[]> {
  const out = new Map<string, Diagnostic[]>();
  for (const d of diagnostics) {
    const file = absolute(d.repo, d.path);
    let list = out.get(file);
    if (!list) out.set(file, (list = []));
    list.push(d);
  }
  return out;
}
