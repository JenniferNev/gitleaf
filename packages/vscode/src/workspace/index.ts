/**
 * Workspace service: one Gitleaf workspace per VS Code workspace folder.
 * Loads gitleaf.yaml through the fs-node adapter, builds the doc index on
 * demand, validates, publishes diagnostics, and feeds the Docs tree.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { loadWorkspace, NodeWorkspaceStore, type Workspace } from '@gitleaf/adapter-fs-node';
import { GitCliVcs } from '@gitleaf/adapter-git-cli';
import type { Diagnostic } from '@gitleaf/core';
import { buildIndex, rootsOf, validateIndex, type DocIndex, type IndexedDoc } from '@gitleaf/index';
import * as vscode from 'vscode';
import { planInit } from './init.js';
import {
  childNodes,
  countProblems,
  groupByFile,
  rootNodes,
  type DocNode,
  type TreeNode,
} from './model.js';

const EMPTY: DocIndex = { docs: [], paths: new Map(), byName: new Map() };

export class GitleafFolder {
  readonly folder: vscode.WorkspaceFolder;
  workspace: Workspace;
  store: NodeWorkspaceStore;
  vcs: GitCliVcs;
  #index: Promise<DocIndex> | undefined;
  diagnostics: readonly Diagnostic[] = [];

  constructor(folder: vscode.WorkspaceFolder) {
    this.folder = folder;
    this.workspace = loadWorkspace(folder.uri.fsPath);
    this.store = new NodeWorkspaceStore(this.workspace.repos);
    this.vcs = new GitCliVcs(this.workspace.repos);
  }

  reload(): void {
    this.workspace = loadWorkspace(this.folder.uri.fsPath);
    this.store = new NodeWorkspaceStore(this.workspace.repos);
    this.vcs = new GitCliVcs(this.workspace.repos);
    this.#index = undefined;
  }

  invalidate(): void {
    this.#index = undefined;
  }

  index(): Promise<DocIndex> {
    if (!this.#index) {
      const config = this.workspace.config;
      this.#index = config === undefined ? Promise.resolve(EMPTY) : buildIndex(this.store, config);
    }
    return this.#index;
  }

  absolute(repo: string, path: string): string {
    const r = this.workspace.repos.find((x) => x.id === repo);
    return join(r?.rootPath ?? this.workspace.repoRoot, path);
  }

  /** Repo id and repo-relative path for a file inside one of this folder's repositories. */
  locate(fsPath: string): { repo: string; path: string } | undefined {
    for (const r of this.workspace.repos) {
      const rel = relative(r.rootPath, fsPath);
      if (rel !== '' && !rel.startsWith('..') && !rel.includes(':'))
        return { repo: r.id, path: rel.split('\\').join('/') };
    }
    return undefined;
  }

  async validate(): Promise<readonly Diagnostic[]> {
    const config = this.workspace.config;
    const out: Diagnostic[] = [...this.workspace.diagnostics];
    if (config !== undefined) {
      const index = await this.index();
      const lastModified = async (doc: IndexedDoc): Promise<Date | undefined> =>
        (await this.vcs.lastModified(doc.repo, doc.path)) ??
        (await this.store.stat(doc.repo, doc.path))?.mtime;
      out.push(
        ...(await validateIndex(index, config, {
          store: this.store,
          now: new Date(),
          lastModified,
        })),
      );
    }
    this.diagnostics = out;
    return out;
  }
}

function toVsDiagnostic(d: Diagnostic, lineText: string | undefined): vscode.Diagnostic {
  const line = Math.max(0, d.line - 1);
  const start = Math.max(0, (d.column ?? 1) - 1);
  const end = lineText === undefined ? start + 1 : Math.max(start + 1, lineText.length);
  const diag = new vscode.Diagnostic(
    new vscode.Range(line, start, line, end),
    d.message,
    d.severity === 'error' ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
  );
  diag.source = 'gitleaf';
  diag.code = d.rule;
  return diag;
}

export class WorkspaceService implements vscode.Disposable, vscode.TreeDataProvider<TreeNode> {
  readonly #folders = new Map<string, GitleafFolder>();
  readonly #diagnostics: vscode.DiagnosticCollection;
  readonly #onDidChangeTreeData = new vscode.EventEmitter<TreeNode | undefined>();
  readonly onDidChangeTreeData = this.#onDidChangeTreeData.event;
  readonly #disposables: vscode.Disposable[] = [];
  #problems: ReadonlyMap<string, number> = new Map();
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly output: vscode.OutputChannel) {
    this.#diagnostics = vscode.languages.createDiagnosticCollection('gitleaf');
    for (const f of vscode.workspace.workspaceFolders ?? [])
      this.#folders.set(f.uri.toString(), new GitleafFolder(f));
    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{md,yaml}');
    this.#disposables.push(
      this.#diagnostics,
      this.#onDidChangeTreeData,
      watcher,
      watcher.onDidChange((uri) => {
        this.#changed(uri);
      }),
      watcher.onDidCreate((uri) => {
        this.#changed(uri);
      }),
      watcher.onDidDelete((uri) => {
        this.#changed(uri);
      }),
      vscode.workspace.onDidChangeWorkspaceFolders((e) => {
        for (const f of e.added) this.#folders.set(f.uri.toString(), new GitleafFolder(f));
        for (const f of e.removed) this.#folders.delete(f.uri.toString());
        void this.refresh();
      }),
      vscode.window.registerTreeDataProvider('gitleaf.docs', this),
      vscode.commands.registerCommand('gitleaf.refreshDocs', () => this.refresh()),
      vscode.commands.registerCommand('gitleaf.openPreview', (node?: DocNode) =>
        this.#openPreview(node),
      ),
      vscode.commands.registerCommand('gitleaf.revealInExplorer', (node?: DocNode) =>
        this.#reveal(node),
      ),
      vscode.commands.registerCommand('gitleaf.initializeWorkspace', () => this.initialize()),
      vscode.commands.registerCommand('gitleaf.validateWorkspace', () => this.refresh()),
    );
    void this.refresh();
  }

  get folders(): readonly GitleafFolder[] {
    return [...this.#folders.values()];
  }

  #changed(uri: vscode.Uri): void {
    const base = uri.fsPath.slice(uri.fsPath.lastIndexOf('/') + 1);
    for (const f of this.#folders.values()) {
      if (base === 'gitleaf.yaml') f.reload();
      else f.invalidate();
    }
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => void this.refresh(), 300);
  }

  /** Re-validates every folder, republishes diagnostics and refreshes the tree. */
  async refresh(): Promise<void> {
    this.#diagnostics.clear();
    const all: Diagnostic[] = [];
    for (const f of this.#folders.values()) {
      f.invalidate();
      try {
        const diagnostics = await f.validate();
        all.push(...diagnostics);
        const grouped = groupByFile(diagnostics, (repo, path) => f.absolute(repo, path));
        for (const [file, list] of grouped) {
          const text = existsSync(file) ? readFileSync(file, 'utf8').split('\n') : [];
          this.#diagnostics.set(
            vscode.Uri.file(file),
            list.map((d) => toVsDiagnostic(d, text[Math.max(0, d.line - 1)])),
          );
        }
      } catch (error) {
        this.output.appendLine(
          `Validation failed for ${f.folder.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    this.#problems = countProblems(all);
    this.#onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(node: TreeNode): vscode.TreeItem {
    if (node.kind === 'doc') {
      const folder = this.#folderOf(node);
      const uri = folder ? vscode.Uri.file(folder.absolute(node.repo, node.path)) : undefined;
      const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.None);
      item.description = node.description;
      item.contextValue = 'doc';
      item.iconPath = new vscode.ThemeIcon(
        node.problems > 0 ? 'warning' : node.status === 'published' ? 'book' : 'file',
      );
      item.tooltip = `${node.path}${node.status ? ` · ${node.status}` : ''}${node.owners.length ? ` · ${node.owners.join(', ')}` : ''}`;
      if (uri) {
        item.resourceUri = uri;
        item.command = { command: 'vscode.open', title: 'Open', arguments: [uri] };
      }
      return item;
    }
    const item = new vscode.TreeItem(node.label, vscode.TreeItemCollapsibleState.Collapsed);
    item.contextValue = node.kind;
    item.iconPath = new vscode.ThemeIcon(node.kind === 'root' ? 'root-folder' : 'folder');
    if (node.kind === 'root') item.description = node.description;
    return item;
  }

  async getChildren(node?: TreeNode): Promise<TreeNode[]> {
    if (!node) {
      const out: TreeNode[] = [];
      for (const f of this.#folders.values()) {
        const config = f.workspace.config;
        if (!config) continue;
        const label = (repo: string) => (repo === '.' ? f.folder.name : repo);
        out.push(
          ...rootNodes(
            rootsOf(config).map((r, i) => ({
              repo: r.repo,
              path: r.root.path,
              name: config.roots[i]?.name,
            })),
            label,
          ).map((n) => ({ ...n, key: `${f.folder.uri.toString()}|${n.key}` })),
        );
      }
      return out;
    }
    if (node.kind === 'doc') return [];
    const folder = this.#folderOf(node);
    if (!folder) return [];
    const index = await folder.index();
    return childNodes(index, node, this.#problems).map((n) => ({
      ...n,
      key: `${folder.folder.uri.toString()}|${n.key}`,
    }));
  }

  #folderOf(node: TreeNode): GitleafFolder | undefined {
    const uriKey = node.key.split('|')[0] ?? '';
    return this.#folders.get(uriKey);
  }

  async #openPreview(node?: DocNode): Promise<void> {
    const folder = node ? this.#folderOf(node) : undefined;
    const uri =
      node && folder
        ? vscode.Uri.file(folder.absolute(node.repo, node.path))
        : vscode.window.activeTextEditor?.document.uri;
    if (!uri) return;
    await vscode.commands.executeCommand('markdown.showPreview', uri);
  }

  async #reveal(node?: DocNode): Promise<void> {
    const folder = node ? this.#folderOf(node) : undefined;
    if (!node || !folder) return;
    await vscode.commands.executeCommand(
      'revealInExplorer',
      vscode.Uri.file(folder.absolute(node.repo, node.path)),
    );
  }

  /** Writes gitleaf.yaml, an AGENTS.md stub and .claude/settings.json without overwriting anything. */
  async initialize(): Promise<void> {
    if (!vscode.workspace.isTrusted) {
      void vscode.window.showWarningMessage(
        'Gitleaf: Initialize Workspace needs a trusted workspace.',
      );
      return;
    }
    const folder = await this.#pickFolder();
    if (!folder) return;
    const root = folder.uri.fsPath;
    const plan = planInit({
      hasDocsFolder: existsSync(join(root, 'docs')),
      exists: (p) => existsSync(join(root, p)),
      read: (p) => readFileSync(join(root, p), 'utf8'),
    });
    const written: string[] = [];
    for (const step of plan) {
      if (step.action === 'skip') continue;
      const target = join(root, step.path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, step.content, 'utf8');
      written.push(`${step.action === 'merge' ? 'updated' : 'created'} ${step.path}`);
    }
    const skipped = plan.filter((s) => s.action === 'skip').map((s) => s.path);
    this.#folders.get(folder.uri.toString())?.reload();
    await this.refresh();
    const summary =
      written.length === 0 ? 'Nothing to do: Gitleaf is already set up.' : written.join(', ');
    void vscode.window.showInformationMessage(
      `Gitleaf: ${summary}${skipped.length ? ` (kept ${skipped.join(', ')})` : ''}`,
    );
  }

  async #pickFolder(): Promise<vscode.WorkspaceFolder | undefined> {
    const folders = vscode.workspace.workspaceFolders ?? [];
    if (folders.length <= 1) return folders[0];
    return vscode.window.showWorkspaceFolderPick({
      placeHolder: 'Initialize Gitleaf in which folder?',
    });
  }

  dispose(): void {
    if (this.#timer) clearTimeout(this.#timer);
    for (const d of this.#disposables) d.dispose();
  }
}
