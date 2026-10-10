import { readFileSync } from 'node:fs';
import { parse } from 'yaml';

/** Minimal frontmatter split for tests only. The real parser is ST-96WHP0KK. */
export function frontmatterOf(markdown: string): unknown {
  if (!markdown.startsWith('---\n')) return undefined;
  const end = markdown.indexOf('\n---\n', 4);
  if (end === -1) return undefined;
  return parse(markdown.slice(4, end));
}

export function loadYaml(path: string): unknown {
  return parse(readFileSync(path, 'utf8'));
}
