import type { LineOwner } from '@gitleaf/core';
import { describe, expect, it } from 'vitest';
import {
  agentOf,
  classifyCommit,
  coalesce,
  lookupTrace,
  parseIdentity,
  parseTraceNote,
} from '../src/index.js';

describe('agent identities', () => {
  it('parses Name <email>', () => {
    expect(parseIdentity('Claude Fable 5.1 <noreply@anthropic.com>')).toEqual({
      name: 'Claude Fable 5.1',
      email: 'noreply@anthropic.com',
    });
    expect(parseIdentity('just a name')).toEqual({ name: 'just a name', email: '' });
  });

  it('recognizes the agents from the research notes and nothing else', () => {
    expect(agentOf({ name: 'Claude Fable 5.1', email: 'noreply@anthropic.com' })).toBe(
      'Claude Fable 5.1',
    );
    expect(agentOf({ name: 'Copilot', email: 'copilot@github.com' })).toBe('Copilot');
    expect(
      agentOf({
        name: 'dependabot[bot]',
        email: '49699333+dependabot[bot]@users.noreply.github.com',
      }),
    ).toBe('dependabot[bot]');
    expect(agentOf({ name: 'Sam Lee', email: 'sam@example.com' })).toBeUndefined();
    expect(agentOf({ name: 'Claudette Ng', email: 'c@example.com' })).toBeUndefined();
  });
});

describe('classifyCommit', () => {
  const human = { name: 'Sam', email: 'sam@example.com' };
  it('human author without agent trailers is human', () => {
    expect(classifyCommit(human, { 'signed-off-by': ['Sam <sam@example.com>'] })).toEqual({
      kind: 'human',
      source: 'blame',
    });
  });
  it('agent co-author makes the commit mixed, with the agent named', () => {
    expect(
      classifyCommit(human, {
        'co-authored-by': ['Li <li@example.com>', 'Claude Fable 5.1 <noreply@anthropic.com>'],
      }),
    ).toEqual({
      kind: 'mixed',
      agent: 'Claude Fable 5.1',
      source: 'trailer',
    });
    expect(
      classifyCommit(human, { 'co-authored-by': ['Copilot <copilot@github.com>'] }),
    ).toMatchObject({ kind: 'mixed', agent: 'Copilot' });
  });
  it('agent author makes the commit agent', () => {
    expect(
      classifyCommit(
        { name: 'github-actions[bot]', email: 'github-actions[bot]@users.noreply.github.com' },
        {},
      ),
    ).toMatchObject({ kind: 'agent', source: 'author' });
  });
});

describe('Agent Trace notes', () => {
  const record = {
    version: '0.1.0',
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-01-23T14:30:00Z',
    vcs: { type: 'git', revision: 'a'.repeat(40) },
    tool: { name: 'cursor', version: '2.4.0' },
    files: [
      {
        path: 'docs/x.md',
        conversations: [
          {
            url: 'https://api.example.com/c/1',
            contributor: { type: 'ai', model_id: 'anthropic/claude-opus-4-5' },
            ranges: [
              { start_line: 4, end_line: 5 },
              { start_line: 9, end_line: 9, contributor: { type: 'mixed' } },
            ],
          },
        ],
      },
    ],
  };

  it('parses a bare JSON note, several records, and Git AI style text with embedded JSON', () => {
    expect(parseTraceNote(JSON.stringify(record))).toHaveLength(1);
    expect(parseTraceNote(`${JSON.stringify(record)}\n${JSON.stringify(record)}`)).toHaveLength(2);
    const gitAi = `docs/x.md session_1 4-5,9\n\n${JSON.stringify(record)}\n`;
    expect(parseTraceNote(gitAi)).toHaveLength(1);
    expect(parseTraceNote('{"version":"0.1","files":"nope"} {"not":"a record"} {broken')).toEqual(
      [],
    );
    expect(parseTraceNote('text with "{" in a string {"version":"0.1.0","files":[]}')).toHaveLength(
      1,
    );
  });

  it('looks up original lines with conversation and range contributors', () => {
    const records = parseTraceNote(JSON.stringify(record));
    expect(lookupTrace(records, 'docs/x.md', 4)).toEqual({
      kind: 'agent',
      agent: 'anthropic/claude-opus-4-5',
      conversation: 'https://api.example.com/c/1',
    });
    expect(lookupTrace(records, 'docs/x.md', 9)).toMatchObject({ kind: 'mixed' });
    expect(lookupTrace(records, 'docs/x.md', 6)).toBeUndefined();
    expect(lookupTrace(records, 'docs/other.md', 4)).toBeUndefined();
  });
});

describe('coalesce', () => {
  it('merges adjacent lines with the same owner only', () => {
    const base = { author: 'Sam', commit: 'c1', source: 'blame' as const, kind: 'human' as const };
    const owners = coalesce([
      { line: 1, ...base },
      { line: 2, ...base },
      { line: 3, ...base, kind: 'mixed', agent: 'Claude', source: 'trailer' },
      { line: 5, ...base },
    ]);
    expect(owners.map((o: LineOwner) => [o.startLine, o.endLine, o.kind])).toEqual([
      [1, 2, 'human'],
      [3, 3, 'mixed'],
      [5, 5, 'human'],
    ]);
  });
});
