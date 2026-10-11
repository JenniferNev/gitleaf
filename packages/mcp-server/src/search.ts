import type { DocIndex, IndexedDoc } from '@gitleaf/index';

export interface SearchHit {
  readonly repo: string;
  readonly path: string;
  readonly title: string;
  readonly score: number;
  /** 1-based line of the best matching body line, when any body line matched. */
  readonly line?: number;
  readonly snippet: string;
}

function titleOf(doc: IndexedDoc): string {
  const fm = doc.doc.frontmatter;
  if (fm && typeof fm.title === 'string') return fm.title;
  const heading = /^#\s+(.+)$/m.exec(doc.doc.body);
  return heading?.[1]?.trim() ?? doc.path;
}

function terms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}_-]+/u)
    .filter((t) => t.length > 1);
}

/** Term-frequency search over titles, paths, frontmatter and bodies. No index persistence; v0. */
export function search(index: DocIndex, query: string, limit = 10): readonly SearchHit[] {
  const q = terms(query);
  if (q.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const doc of index.docs) {
    const title = titleOf(doc);
    const lowerTitle = title.toLowerCase();
    const lowerPath = doc.path.toLowerCase();
    const fmText = JSON.stringify(doc.doc.frontmatter ?? {}).toLowerCase();
    let score = 0;
    let bestLine: number | undefined;
    let bestLineScore = 0;
    let snippet = '';
    const bodyLines = doc.doc.body.split('\n');
    for (const term of q) {
      if (lowerTitle.includes(term)) score += 10;
      if (lowerPath.includes(term)) score += 5;
      if (fmText.includes(term)) score += 3;
    }
    bodyLines.forEach((line, i) => {
      const lower = line.toLowerCase();
      const lineScore = q.reduce((n, term) => n + (lower.includes(term) ? 1 : 0), 0);
      if (lineScore > 0) score += lineScore;
      if (lineScore > bestLineScore) {
        bestLineScore = lineScore;
        bestLine = i + 1;
        snippet = line.trim().slice(0, 200);
      }
    });
    if (score === 0) continue;
    const offset = doc.doc.meta.hasFrontmatter
      ? 2 + doc.doc.meta.frontmatterText.split('\n').length - 1
      : 0;
    hits.push({
      repo: doc.repo,
      path: doc.path,
      title,
      score,
      ...(bestLine === undefined ? {} : { line: bestLine + offset }),
      snippet: snippet || title,
    });
  }
  return hits.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path)).slice(0, limit);
}
