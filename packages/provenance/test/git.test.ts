/**
 * End to end over a real temporary git repository: blame, trailers and an
 * Agent Trace note under refs/notes/ai, as Git AI writes them.
 */
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GitCliVcs, parsePorcelainBlame, parseTrailers } from '@gitleaf/adapter-git-cli';
import { beforeAll, describe, expect, it } from 'vitest';
import { GitProvenance } from '../src/index.js';

let root: string;
let git: (...args: string[]) => string;
let agentCommit = '';

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'gitleaf-prov-'));
  git = (...args: string[]) =>
    execFileSync('git', ['-C', root, ...args], { stdio: 'pipe', encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'main');
  git('config', 'user.name', 'Sam Lee');
  git('config', 'user.email', 'sam@example.com');
  git('config', 'commit.gpgsign', 'false');
  await mkdir(join(root, 'docs'), { recursive: true });

  // Commit 1: a human writes three lines.
  await writeFile(join(root, 'docs/x.md'), '# Title\n\nHuman paragraph.\n');
  git('add', '.');
  git('commit', '-q', '-m', 'Write the doc');

  // Commit 2: a human commits with an agent co-author trailer; lines 4-5 are new, line 2 edited.
  await writeFile(
    join(root, 'docs/x.md'),
    '# Title\nEdited intro.\nHuman paragraph.\nAgent paragraph one.\nAgent paragraph two.\n',
  );
  git('add', '.');
  git(
    'commit',
    '-q',
    '-m',
    'Expand the doc\n\nCo-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>\nSigned-off-by: Sam Lee <sam@example.com>',
  );
  agentCommit = git('rev-parse', 'HEAD');
  const trace = {
    version: '0.1.0',
    id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-10-11T00:00:00Z',
    vcs: { type: 'git', revision: agentCommit },
    tool: { name: 'claude-code' },
    files: [
      {
        path: 'docs/x.md',
        conversations: [
          {
            contributor: { type: 'ai', model_id: 'anthropic/claude-fable-5-1' },
            ranges: [{ start_line: 4, end_line: 5 }],
          },
        ],
      },
    ],
  };
  git(
    'notes',
    '--ref=ai',
    'add',
    '-m',
    `docs/x.md session_1 4-5\n\n${JSON.stringify(trace)}`,
    agentCommit,
  );

  // Commit 3: authored by a bot identity.
  await writeFile(
    join(root, 'docs/x.md'),
    '# Title\nEdited intro.\nHuman paragraph.\nAgent paragraph one.\nAgent paragraph two.\nBot footer.\n',
  );
  git('add', '.');
  git(
    '-c',
    'user.name=github-actions[bot]',
    '-c',
    'user.email=github-actions[bot]@users.noreply.github.com',
    'commit',
    '-q',
    '-m',
    'Add footer',
  );

  // Uncommitted: line 7.
  await writeFile(
    join(root, 'docs/x.md'),
    '# Title\nEdited intro.\nHuman paragraph.\nAgent paragraph one.\nAgent paragraph two.\nBot footer.\nDraft line.\n',
  );
});

describe('GitCliVcs parsing', () => {
  it('parses porcelain blame with original line numbers and uncommitted lines', async () => {
    const vcs = new GitCliVcs([{ id: '.', rootPath: root }]);
    const blame = await vcs.blame('.', 'docs/x.md');
    expect(blame.map((b) => [b.line, b.originalLine, b.author])).toEqual([
      [1, 1, 'Sam Lee'],
      [2, 2, 'Sam Lee'],
      [3, 3, 'Sam Lee'],
      [4, 4, 'Sam Lee'],
      [5, 5, 'Sam Lee'],
      [6, 6, 'github-actions[bot]'],
      [7, 7, 'Not Committed Yet'],
    ]);
    expect(blame[6]?.commit).toBe('0'.repeat(40));
    expect(blame[3]?.commit).toBe(agentCommit);
    expect(blame[0]?.authorEmail).toBe('sam@example.com');
  });

  it('reads trailers and notes', async () => {
    const vcs = new GitCliVcs([{ id: '.', rootPath: root }]);
    expect(await vcs.commitTrailers('.', agentCommit)).toEqual({
      'co-authored-by': ['Claude Fable 5.1 <noreply@anthropic.com>'],
      'signed-off-by': ['Sam Lee <sam@example.com>'],
    });
    expect(await vcs.note('.', agentCommit, 'ai')).toContain(
      '"model_id":"anthropic/claude-fable-5-1"',
    );
    expect(await vcs.note('.', 'HEAD', 'ai')).toBeUndefined();
    expect((await vcs.status('.')).map((c) => [c.path, c.status])).toEqual([
      ['docs/x.md', 'modified'],
    ]);
  });

  it('parsers handle edge cases', () => {
    expect(parsePorcelainBlame('')).toEqual([]);
    expect(parseTrailers('not a trailer\nKey: value\nkey: other')).toEqual({
      key: ['value', 'other'],
    });
  });
});

describe('GitProvenance', () => {
  it('layers blame, trailers and Agent Trace into line owners', async () => {
    const prov = new GitProvenance(new GitCliVcs([{ id: '.', rootPath: root }]));
    const result = await prov.provenance('.', 'docs/x.md');
    expect(result.lines).toBe(7);
    expect(result.byKind).toEqual({ human: 2, agent: 3, mixed: 1, unknown: 1 });
    expect(
      result.owners.map((o) => [o.startLine, o.endLine, o.kind, o.source, o.agent ?? '']),
    ).toEqual([
      [1, 1, 'human', 'blame', ''],
      [2, 2, 'mixed', 'trailer', 'Claude Fable 5.1'],
      [3, 3, 'human', 'blame', ''],
      [4, 5, 'agent', 'agent-trace', 'anthropic/claude-fable-5-1'],
      [6, 6, 'agent', 'author', 'github-actions[bot]'],
      [7, 7, 'unknown', 'uncommitted', ''],
    ]);
  });
});
