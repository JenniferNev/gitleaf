import type { DocRootSpec, Repo, RepoRelativePath, WorkspaceStore } from '@gitleaf/core';
import { parse, type ParsedDoc } from '@gitleaf/format';
import type { GitleafConfig } from '@gitleaf/schema';
import { extractLinks, type Link } from './links.js';

export interface IndexedDoc {
  readonly repo: Repo['id'];
  readonly path: RepoRelativePath;
  /** The root this doc was found under. */
  readonly root: DocRootSpec;
  readonly text: string;
  readonly doc: ParsedDoc;
  readonly links: readonly Link[];
}

export interface DocIndex {
  readonly docs: readonly IndexedDoc[];
  /** `repo` → set of repo-relative paths, for existence checks without I/O. */
  readonly paths: ReadonlyMap<string, ReadonlySet<string>>;
  /** lower-cased basename without `.md` → docs, for wikilink resolution across repos. */
  readonly byName: ReadonlyMap<string, readonly IndexedDoc[]>;
}

export const DEFAULT_INCLUDE = ['**/*.md'];

/** Turns `gitleaf.yaml` roots into `(repo id, root spec)` pairs. The current repository is `.`. */
export function rootsOf(config: GitleafConfig): readonly { repo: string; root: DocRootSpec }[] {
  return config.roots.map((r) => ({
    repo: r.repo ?? '.',
    root: { path: r.path, include: r.include ?? DEFAULT_INCLUDE, exclude: r.exclude ?? [] },
  }));
}

export function docName(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  return base.replace(/\.md$/i, '').toLowerCase();
}

/** Body line numbers become file line numbers: the frontmatter block (two delimiters plus its lines) comes first. */
function fileLines(doc: ParsedDoc, links: readonly Link[]): readonly Link[] {
  if (!doc.meta.hasFrontmatter) return links;
  const offset = 2 + doc.meta.frontmatterText.split('\n').length - 1;
  return links.map((l) => ({ ...l, line: l.line + offset }));
}

/** Reads and parses every doc under every root. Pure over the store: no other I/O. */
export async function buildIndex(store: WorkspaceStore, config: GitleafConfig): Promise<DocIndex> {
  const docs: IndexedDoc[] = [];
  const paths = new Map<string, Set<string>>();
  const byName = new Map<string, IndexedDoc[]>();
  for (const { repo, root } of rootsOf(config)) {
    const files = await store.listFiles(repo, root);
    for (const path of files) {
      const text = await store.readText(repo, path);
      const doc = parse(text);
      const entry: IndexedDoc = {
        repo,
        path,
        root,
        text,
        doc,
        links: fileLines(doc, extractLinks(doc.body)),
      };
      docs.push(entry);
      let set = paths.get(repo);
      if (!set) paths.set(repo, (set = new Set()));
      set.add(path);
      const name = docName(path);
      let list = byName.get(name);
      if (!list) byName.set(name, (list = []));
      list.push(entry);
    }
  }
  return { docs, paths, byName };
}
