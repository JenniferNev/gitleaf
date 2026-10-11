/**
 * The "Token preview" webview: renders every token, an item card and a speech
 * bubble under a strict CSP. HTML is generated here from data only; the pack's
 * tokens CSS is linked as a stylesheet after validation, never inlined or executed.
 */
import { escapeHtml } from '@gitleaf/core';
import type { LoadedPack } from './loader.js';

export const TOKEN_NAMES: readonly string[] = [
  '--gl-text',
  '--gl-text-muted',
  '--gl-text-disabled',
  '--gl-link',
  '--gl-surface-raised',
  '--gl-surface-hover',
  '--gl-surface-selected',
  '--gl-border',
  '--gl-focus',
  '--gl-button-bg',
  '--gl-button-fg',
  '--gl-input-bg',
  '--gl-badge-bg',
  '--gl-error',
  '--gl-warning',
  '--gl-info',
  '--gl-success',
  '--gl-provenance-human',
  '--gl-provenance-agent',
  '--gl-provenance-mixed',
  '--gl-provenance-unknown',
  '--gl-review-draft',
  '--gl-review-open',
  '--gl-review-changes',
  '--gl-review-approved',
  '--gl-review-merged',
  '--gl-doc-draft',
  '--gl-doc-published',
  '--gl-doc-stale',
  '--gl-doc-archived',
  '--gl-chart-1',
  '--gl-chart-2',
  '--gl-chart-3',
  '--gl-chart-4',
  '--gl-chart-5',
  '--gl-chart-6',
];

export interface PreviewUris {
  /** `webview.cspSource` */
  readonly cspSource: string;
  /** Webview URI of media/tokens.css */
  readonly tokensCss: string;
  /** Webview URI of media/preview.css */
  readonly previewCss: string;
  /** Webview URI of the active pack's tokens CSS, when a pack is active. */
  readonly packCss?: string;
  /** Webview URI of the pack's mascot face for the `empty-docs` moment, when any. */
  readonly mascot?: string;
}

export interface PreviewModel {
  readonly appearanceLabel: string;
  readonly appearanceId: string;
  readonly voice?: string;
  readonly tagline?: string;
}

export function cspFor(cspSource: string, nonce: string): string {
  return `default-src 'none'; style-src ${cspSource}; script-src 'nonce-${nonce}'; img-src ${cspSource} data:; font-src ${cspSource}`;
}

export function previewModel(pack: LoadedPack | undefined): PreviewModel {
  if (!pack) return { appearanceLabel: 'Default (neutral)', appearanceId: 'default' };
  const voice = pack.mascot?.map['empty-docs']?.voice;
  const tagline = pack.copy.en?.tagline;
  return {
    appearanceLabel: pack.label,
    appearanceId: pack.id,
    ...(voice === undefined ? {} : { voice }),
    ...(tagline === undefined ? {} : { tagline }),
  };
}

/** The whole page. Every string from a pack goes through escapeHtml. */
export function renderPreview(uris: PreviewUris, model: PreviewModel, nonce: string): string {
  const tokens = TOKEN_NAMES.map(
    (name) =>
      `<div class="token" title="${escapeHtml(name)}"><span class="swatch" style="background: var(${escapeHtml(name)})"></span><span class="name">${escapeHtml(name)}</span></div>`,
  ).join('\n');
  const packLink =
    uris.packCss === undefined
      ? ''
      : `<link id="pack-css" rel="stylesheet" href="${escapeHtml(uris.packCss)}">`;
  const mascot =
    uris.mascot === undefined ? '' : `<img class="mascot" alt="" src="${escapeHtml(uris.mascot)}">`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="${cspFor(uris.cspSource, nonce)}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Gitleaf token preview</title>
<link rel="stylesheet" href="${escapeHtml(uris.tokensCss)}">
${packLink}
<link rel="stylesheet" href="${escapeHtml(uris.previewCss)}">
</head>
<body>
<h1>Token preview</h1>
<p class="meta">Appearance: <strong id="appearance">${escapeHtml(model.appearanceLabel)}</strong> <span class="name">${escapeHtml(model.appearanceId)}</span></p>
<h2>Tokens</h2>
<div class="grid">
${tokens}
</div>
<h2>Item card</h2>
<article class="card" aria-label="Sample doc card">
  <div class="title">docs/release-process.md</div>
  <div class="row"><span class="chip">DOC-7K3MQ2RS</span><span class="pill open">in review · PR #42</span><span class="pill stale">stale</span><span class="pill approved">approved</span></div>
  <div class="share" role="img" aria-label="62% human, 38% agent"><span class="human" style="flex: 62"></span><span class="agent" style="flex: 38"></span><span class="mixed" style="flex: 0"></span></div>
  <div class="row"><button class="primary" type="button">Open raw</button><span class="name">sam, li · 2 hours ago</span></div>
</article>
<h2>Speech bubble</h2>
<div class="bubble">${mascot}<span>No docs match your search.</span>${model.voice === undefined ? '' : ` <span class="voice">${escapeHtml(model.voice)}</span>`}</div>
${model.tagline === undefined ? '' : `<p class="meta">${escapeHtml(model.tagline)}</p>`}
<p class="notice">Structure follows your color theme; accents are Gitleaf's contributed colors. Switch themes or run <em>Gitleaf: Select Appearance</em> to compare.</p>
<script nonce="${nonce}">
  window.addEventListener('message', (event) => {
    const msg = event.data;
    if (!msg || msg.type !== 'appearance') return;
    let link = document.getElementById('pack-css');
    if (msg.packCss) {
      if (!link) { link = document.createElement('link'); link.id = 'pack-css'; link.rel = 'stylesheet'; document.head.appendChild(link); }
      link.href = msg.packCss;
    } else if (link) {
      link.remove();
    }
    document.getElementById('appearance').textContent = msg.label;
  });
</script>
</body>
</html>`;
}

export function makeNonce(random: () => number = Math.random): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < 32; i++) out += chars.charAt(Math.floor(random() * chars.length));
  return out;
}
