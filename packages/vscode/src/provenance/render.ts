/**
 * Pure rendering for provenance: hover Markdown, CodeLens title and the
 * Provenance view HTML. No vscode import.
 */
import { escapeHtml, type DocProvenance, type LineOwner } from '@gitleaf/core';
import { cspFor } from '../appearance/preview.js';

const KIND_WORD: Record<LineOwner['kind'], string> = {
  human: 'human',
  agent: 'agent',
  mixed: 'human + agent',
  unknown: 'unknown',
};

export function ownerAt(p: DocProvenance, line: number): LineOwner | undefined {
  return p.owners.find((o) => line >= o.startLine && line <= o.endLine);
}

function who(o: LineOwner): string {
  if (o.source === 'uncommitted') return 'Not committed yet';
  if (o.kind === 'agent') return o.agent ?? o.author;
  if (o.agent !== undefined) return `${o.author} with ${o.agent}`;
  return o.author;
}

/** Markdown for the hover. Everything from git goes through escaping of Markdown-sensitive characters. */
export function hoverMarkdown(o: LineOwner): string {
  const md = (s: string) => s.replace(/[\\`*_{}[\]()#+\-.!|>]/g, (c) => `\\${c}`);
  const lines: string[] = [];
  lines.push(`**${md(who(o))}** · ${KIND_WORD[o.kind]}`);
  if (o.source !== 'uncommitted') {
    const date = o.commitDate === undefined ? '' : ` · ${o.commitDate.toISOString().slice(0, 10)}`;
    lines.push(`\`${o.commit.slice(0, 7)}\`${date} · source: ${o.source}`);
  }
  if (o.pullRequest !== undefined) {
    const approvers =
      o.approvedBy && o.approvedBy.length > 0
        ? ` · approved by ${o.approvedBy.map(md).join(', ')}`
        : ' · no approvals recorded';
    lines.push(`PR #${md(o.pullRequest)}${approvers}`);
  }
  lines.push(`Lines ${String(o.startLine)}–${String(o.endLine)}`);
  return lines.join('  \n');
}

export function pct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((100 * n) / total);
}

export function codeLensTitle(p: DocProvenance): string {
  const parts = [
    `${String(pct(p.byKind.human, p.lines))}% human`,
    `${String(pct(p.byKind.agent, p.lines))}% agent`,
  ];
  if (p.byKind.mixed > 0) parts.push(`${String(pct(p.byKind.mixed, p.lines))}% mixed`);
  if (p.byKind.unknown > 0) parts.push(`${String(pct(p.byKind.unknown, p.lines))}% uncommitted`);
  return `Provenance: ${parts.join(' · ')}`;
}

export interface ProvenanceViewUris {
  readonly cspSource: string;
  readonly tokensCss: string;
  readonly viewCss: string;
}

export function renderProvenanceView(
  uris: ProvenanceViewUris,
  p: DocProvenance,
  nonce: string,
): string {
  const rows = p.owners
    .map((o) => {
      const lines =
        o.startLine === o.endLine
          ? String(o.startLine)
          : `${String(o.startLine)}–${String(o.endLine)}`;
      const pr =
        o.pullRequest === undefined
          ? ''
          : `PR #${escapeHtml(o.pullRequest)}${o.approvedBy && o.approvedBy.length > 0 ? ` · ${escapeHtml(o.approvedBy.join(', '))}` : ''}`;
      return `<tr class="row ${o.kind}" data-line="${String(o.startLine)}" tabindex="0" role="button" aria-label="Reveal lines ${escapeHtml(lines)}">
  <td class="mono">${escapeHtml(lines)}</td>
  <td><span class="dot ${o.kind}" aria-hidden="true"></span>${escapeHtml(KIND_WORD[o.kind])}</td>
  <td>${escapeHtml(who(o))}</td>
  <td class="mono">${o.source === 'uncommitted' ? '' : escapeHtml(o.commit.slice(0, 7))}</td>
  <td>${pr}</td>
</tr>`;
    })
    .join('\n');
  const share = (['human', 'agent', 'mixed', 'unknown'] as const)
    .map(
      (k) =>
        `<span class="${k}" style="flex: ${String(p.byKind[k])}" title="${k}: ${String(p.byKind[k])} lines"></span>`,
    )
    .join('');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${cspFor(uris.cspSource, nonce)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gitleaf provenance</title>
<link rel="stylesheet" href="${escapeHtml(uris.tokensCss)}">
<link rel="stylesheet" href="${escapeHtml(uris.viewCss)}">
</head>
<body>
<h1>${escapeHtml(p.path)}</h1>
<p class="meta">${String(p.lines)} lines · ${escapeHtml(codeLensTitle(p).replace('Provenance: ', ''))}</p>
<div class="share" role="img" aria-label="${escapeHtml(codeLensTitle(p))}">${share}</div>
<table>
<thead><tr><th>Lines</th><th>Kind</th><th>Who</th><th>Commit</th><th>Review</th></tr></thead>
<tbody>
${rows}
</tbody>
</table>
<p class="meta">Click a row to reveal those lines. Approvals come from the pull request that merged the commit.</p>
<script nonce="${nonce}">
  const vscode = acquireVsCodeApi();
  for (const row of document.querySelectorAll('tr.row')) {
    const go = () => vscode.postMessage({ type: 'reveal', line: Number(row.dataset.line) });
    row.addEventListener('click', go);
    row.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
  }
</script>
</body>
</html>`;
}
