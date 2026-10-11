import { describe, expect, it } from 'vitest';
import type { DocProvenance, LineOwner } from '@gitleaf/core';
import {
  codeLensTitle,
  hoverMarkdown,
  ownerAt,
  pct,
  renderProvenanceView,
} from '../src/provenance/render.js';

const owners: LineOwner[] = [
  {
    startLine: 1,
    endLine: 3,
    kind: 'human',
    author: 'Sam Lee',
    commit: 'a'.repeat(40),
    commitDate: new Date('2026-10-10T00:00:00Z'),
    source: 'blame',
    pullRequest: '42',
    approvedBy: ['li', 'maria'],
  },
  {
    startLine: 4,
    endLine: 5,
    kind: 'agent',
    author: 'Sam Lee',
    agent: 'anthropic/claude-fable-5-1',
    commit: 'b'.repeat(40),
    source: 'agent-trace',
    pullRequest: '42',
    approvedBy: [],
  },
  {
    startLine: 6,
    endLine: 6,
    kind: 'mixed',
    author: 'Jenn',
    agent: 'Claude',
    commit: 'c'.repeat(40),
    source: 'trailer',
  },
  {
    startLine: 7,
    endLine: 7,
    kind: 'unknown',
    author: 'uncommitted',
    commit: '0'.repeat(40),
    source: 'uncommitted',
  },
];
const p: DocProvenance = {
  repo: '.',
  path: 'docs/x.md',
  owners,
  lines: 7,
  byKind: { human: 3, agent: 2, mixed: 1, unknown: 1 },
};

describe('provenance rendering', () => {
  it('finds the owner of a line and formats the hover', () => {
    expect(ownerAt(p, 4)?.kind).toBe('agent');
    expect(ownerAt(p, 99)).toBeUndefined();
    expect(hoverMarkdown(owners[0]!)).toBe(
      '**Sam Lee** · human  \n`aaaaaaa` · 2026-10-10 · source: blame  \nPR #42 · approved by li, maria  \nLines 1–3',
    );
    expect(hoverMarkdown(owners[1]!)).toContain('**anthropic/claude\\-fable\\-5\\-1** · agent');
    expect(hoverMarkdown(owners[1]!)).toContain('no approvals recorded');
    expect(hoverMarkdown(owners[2]!)).toContain('**Jenn with Claude** · human + agent');
    expect(hoverMarkdown(owners[3]!)).toBe('**Not committed yet** · unknown  \nLines 7–7');
  });

  it('computes the CodeLens title', () => {
    expect(pct(1, 3)).toBe(33);
    expect(codeLensTitle(p)).toBe(
      'Provenance: 43% human · 29% agent · 14% mixed · 14% uncommitted',
    );
    expect(
      codeLensTitle({ ...p, lines: 2, byKind: { human: 2, agent: 0, mixed: 0, unknown: 0 } }),
    ).toBe('Provenance: 100% human · 0% agent');
  });

  it('renders the view with a strict CSP, the share bar and escaped rows', () => {
    const html = renderProvenanceView(
      {
        cspSource: 'vscode-webview://x',
        tokensCss: 'vscode-webview://x/tokens.css',
        viewCss: 'vscode-webview://x/provenance.css',
      },
      { ...p, owners: [{ ...owners[0]!, author: '<b>Sam</b>' }] },
      'N0NCE',
    );
    expect(html).toContain(`script-src 'nonce-N0NCE'`);
    expect(html).toContain('&lt;b&gt;Sam&lt;/b&gt;');
    expect(html).not.toContain('<b>Sam</b>');
    expect(html).toContain('<span class="human" style="flex: 3"');
    expect(html).toContain('data-line="1"');
    expect(html).toContain('PR #42 · li, maria');
  });
});
