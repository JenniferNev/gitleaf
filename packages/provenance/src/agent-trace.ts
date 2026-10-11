/**
 * Agent Trace (https://agent-trace.dev, v0.1 RFC) records as stored in git
 * notes, for example by Git AI under `refs/notes/ai`. Gitleaf reads the format
 * and never writes it.
 */
import type { ContributorKind } from '@gitleaf/core';

export interface TraceRange {
  readonly start_line: number;
  readonly end_line: number;
  readonly contributor?: TraceContributor;
}

export interface TraceContributor {
  readonly type: 'human' | 'ai' | 'mixed' | 'unknown';
  readonly model_id?: string;
}

export interface TraceConversation {
  readonly url?: string;
  readonly contributor?: TraceContributor;
  readonly ranges: readonly TraceRange[];
}

export interface TraceFile {
  readonly path: string;
  readonly conversations: readonly TraceConversation[];
}

export interface TraceRecord {
  readonly version: string;
  readonly id?: string;
  readonly timestamp?: string;
  readonly vcs?: { readonly type: string; readonly revision: string };
  readonly tool?: { readonly name?: string; readonly version?: string };
  readonly files: readonly TraceFile[];
}

/** A resolved attribution for one original line of one commit. */
export interface TraceHit {
  readonly kind: ContributorKind;
  readonly agent?: string;
  readonly conversation?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Extracts Agent Trace records from a note's text. A note may hold one JSON
 * object, several concatenated or newline-separated objects, or text with JSON
 * objects embedded after other lines (Git AI prints a human summary first).
 */
export function parseTraceNote(text: string): readonly TraceRecord[] {
  const records: TraceRecord[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') {
      if (depth === 0) start = i;
      depth++;
    } else if (ch === '}') {
      depth--;
      if (depth === 0 && start !== -1) {
        try {
          const value: unknown = JSON.parse(text.slice(start, i + 1));
          if (isTraceRecord(value)) records.push(value);
        } catch {
          // Not JSON after all: keep scanning.
        }
        start = -1;
      }
    }
  }
  return records;
}

export function isTraceRecord(value: unknown): value is TraceRecord {
  if (!isRecord(value) || typeof value.version !== 'string' || !Array.isArray(value.files))
    return false;
  return value.files.every(
    (f) =>
      isRecord(f) &&
      typeof f.path === 'string' &&
      Array.isArray(f.conversations) &&
      f.conversations.every((c) => isRecord(c) && Array.isArray(c.ranges)),
  );
}

export function toKind(type: TraceContributor['type'] | undefined): ContributorKind {
  switch (type) {
    case 'ai':
      return 'agent';
    case 'human':
      return 'human';
    case 'mixed':
      return 'mixed';
    default:
      return 'unknown';
  }
}

/** Finds the attribution of `originalLine` in `path` across the records of one commit. */
export function lookupTrace(
  records: readonly TraceRecord[],
  path: string,
  originalLine: number,
): TraceHit | undefined {
  for (const record of records) {
    for (const file of record.files) {
      if (file.path !== path) continue;
      for (const conversation of file.conversations) {
        for (const range of conversation.ranges) {
          if (originalLine < range.start_line || originalLine > range.end_line) continue;
          const contributor = range.contributor ?? conversation.contributor;
          const agent = contributor?.model_id ?? record.tool?.name;
          return {
            kind: toKind(contributor?.type),
            ...(agent === undefined ? {} : { agent }),
            ...(conversation.url === undefined ? {} : { conversation: conversation.url }),
          };
        }
      }
    }
  }
  return undefined;
}
