/**
 * Provenance in the editor: hover per line, a CodeLens with the share, and the
 * Provenance view. Blame runs through the git binary vscode.git uses, with the
 * shared porcelain parser; GitHub approvals come through the VS Code GitHub
 * authentication session when one exists.
 */
import { GitHubForge } from '@gitleaf/adapter-forge-github';
import { GitCliVcs } from '@gitleaf/adapter-git-cli';
import type { DocProvenance } from '@gitleaf/core';
import { GitProvenance } from '@gitleaf/provenance';
import * as vscode from 'vscode';
import { makeNonce } from '../appearance/preview.js';
import type { GitleafFolder, WorkspaceService } from '../workspace/index.js';
import { codeLensTitle, hoverMarkdown, ownerAt, renderProvenanceView } from './render.js';

interface GitApiLike {
  readonly git: { readonly path: string };
}

function gitPath(): string | undefined {
  const ext = vscode.extensions.getExtension<{ getAPI(v: 1): GitApiLike }>('vscode.git');
  try {
    return ext?.exports.getAPI(1).git.path;
  } catch {
    return undefined;
  }
}

async function githubSession(): Promise<string | undefined> {
  try {
    const session = await vscode.authentication.getSession('github', ['repo'], { silent: true });
    return session?.accessToken;
  } catch {
    return undefined;
  }
}

const SELECTOR: vscode.DocumentSelector = { language: 'markdown', scheme: 'file' };

export class ProvenanceService
  implements vscode.Disposable, vscode.HoverProvider, vscode.CodeLensProvider
{
  readonly #cache = new Map<
    string,
    { version: number; mtime: number; value: Promise<DocProvenance | undefined> }
  >();
  readonly #onDidChangeCodeLenses = new vscode.EventEmitter<void>();
  readonly onDidChangeCodeLenses = this.#onDidChangeCodeLenses.event;
  readonly #disposables: vscode.Disposable[] = [];
  #panel: vscode.WebviewPanel | undefined;
  #panelUri: vscode.Uri | undefined;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly workspaces: WorkspaceService,
    private readonly output: vscode.OutputChannel,
  ) {
    this.#disposables.push(
      this.#onDidChangeCodeLenses,
      vscode.languages.registerHoverProvider(SELECTOR, this),
      vscode.languages.registerCodeLensProvider(SELECTOR, this),
      vscode.workspace.onDidSaveTextDocument((doc) => {
        this.#cache.delete(doc.uri.toString());
        this.#onDidChangeCodeLenses.fire();
        if (this.#panelUri?.toString() === doc.uri.toString()) void this.#renderPanel(doc.uri);
      }),
      vscode.commands.registerCommand('gitleaf.showProvenance', (uri?: vscode.Uri) =>
        this.show(uri ?? vscode.window.activeTextEditor?.document.uri),
      ),
    );
  }

  #folderFor(uri: vscode.Uri): { folder: GitleafFolder; repo: string; path: string } | undefined {
    for (const folder of this.workspaces.folders) {
      const located = folder.locate(uri.fsPath);
      if (located) return { folder, ...located };
    }
    return undefined;
  }

  /** Provenance for a file, cached per document version and file mtime. */
  provenance(uri: vscode.Uri, version: number): Promise<DocProvenance | undefined> {
    const key = uri.toString();
    const hit = this.#cache.get(key);
    if (hit?.version === version) return hit.value;
    const located = this.#folderFor(uri);
    if (!located) return Promise.resolve(undefined);
    const vcs = new GitCliVcs(located.folder.workspace.repos, { gitPath: gitPath() });
    const forge = new GitHubForge({
      token: githubSession,
      remoteUrl: (repo) => vcs.remoteUrl(repo),
    });
    const value = new GitProvenance(vcs, { forge })
      .provenance(located.repo, located.path)
      .catch((error: unknown) => {
        this.output.appendLine(
          `Provenance failed for ${located.path}: ${error instanceof Error ? error.message : String(error)}`,
        );
        return undefined;
      });
    this.#cache.set(key, { version, mtime: Date.now(), value });
    return value;
  }

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<vscode.Hover | undefined> {
    if (document.isDirty) return undefined;
    const p = await this.provenance(document.uri, document.version);
    if (!p) return undefined;
    const owner = ownerAt(p, position.line + 1);
    if (!owner) return undefined;
    const md = new vscode.MarkdownString(hoverMarkdown(owner));
    md.isTrusted = false;
    return new vscode.Hover(md, new vscode.Range(owner.startLine - 1, 0, owner.endLine - 1, 0));
  }

  async provideCodeLenses(document: vscode.TextDocument): Promise<vscode.CodeLens[]> {
    if (
      vscode.workspace.getConfiguration('gitleaf').get<string>('provenance.display', 'hover') ===
      'off'
    )
      return [];
    const p = await this.provenance(document.uri, document.version);
    if (!p || p.lines === 0) return [];
    return [
      new vscode.CodeLens(new vscode.Range(0, 0, 0, 0), {
        title: codeLensTitle(p),
        command: 'gitleaf.showProvenance',
        arguments: [document.uri],
      }),
    ];
  }

  async show(uri: vscode.Uri | undefined): Promise<void> {
    if (!uri) return;
    this.#panelUri = uri;
    if (!this.#panel) {
      const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
      this.#panel = vscode.window.createWebviewPanel(
        'gitleaf.provenance',
        'Gitleaf: Provenance',
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          localResourceRoots: [media],
          retainContextWhenHidden: true,
        },
      );
      this.#panel.onDidDispose(() => {
        this.#panel = undefined;
        this.#panelUri = undefined;
      });
      this.#panel.webview.onDidReceiveMessage((msg: { type?: string; line?: number }) => {
        if (msg.type === 'reveal' && typeof msg.line === 'number' && this.#panelUri)
          void this.#reveal(this.#panelUri, msg.line);
      });
    } else {
      this.#panel.reveal();
    }
    await this.#renderPanel(uri);
  }

  async #renderPanel(uri: vscode.Uri): Promise<void> {
    const panel = this.#panel;
    if (!panel) return;
    const doc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === uri.toString());
    const p = await this.provenance(uri, doc?.version ?? 0);
    const media = vscode.Uri.joinPath(this.context.extensionUri, 'media');
    const w = panel.webview;
    if (!p) {
      w.html =
        '<!DOCTYPE html><html><body><p>No provenance available for this file (not in a Gitleaf doc root, or not a git repository).</p></body></html>';
      return;
    }
    panel.title = `Gitleaf: Provenance · ${p.path.slice(p.path.lastIndexOf('/') + 1)}`;
    w.html = renderProvenanceView(
      {
        cspSource: w.cspSource,
        tokensCss: w.asWebviewUri(vscode.Uri.joinPath(media, 'tokens.css')).toString(),
        viewCss: w.asWebviewUri(vscode.Uri.joinPath(media, 'provenance.css')).toString(),
      },
      p,
      makeNonce(),
    );
  }

  async #reveal(uri: vscode.Uri, line: number): Promise<void> {
    const editor = await vscode.window.showTextDocument(uri, {
      viewColumn: vscode.ViewColumn.One,
      preserveFocus: false,
    });
    const pos = new vscode.Position(Math.max(0, line - 1), 0);
    editor.selection = new vscode.Selection(pos, pos);
    editor.revealRange(new vscode.Range(pos, pos), vscode.TextEditorRevealType.InCenter);
  }

  dispose(): void {
    for (const d of this.#disposables) d.dispose();
    this.#panel?.dispose();
  }
}
