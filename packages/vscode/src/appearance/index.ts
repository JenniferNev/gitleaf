/**
 * Appearance service: discovery on activation and on extension changes, the
 * gitleaf.appearance setting with a silent fallback, the Token preview panel
 * and the Select Appearance command with live preview.
 */
import * as vscode from 'vscode';
import {
  discoverPacks,
  formatRejection,
  resolveAppearance,
  type Discovery,
  type LoadedPack,
} from './loader.js';
import { makeNonce, previewModel, renderPreview } from './preview.js';

export const SETTING = 'gitleaf.appearance';

export class AppearanceService implements vscode.Disposable {
  readonly #context: vscode.ExtensionContext;
  readonly #output: vscode.OutputChannel;
  readonly #onDidChange = new vscode.EventEmitter<void>();
  readonly onDidChange = this.#onDidChange.event;
  #discovery: Discovery = { packs: new Map(), rejected: [] };
  #panel: vscode.WebviewPanel | undefined;
  readonly #disposables: vscode.Disposable[] = [];

  constructor(context: vscode.ExtensionContext, output: vscode.OutputChannel) {
    this.#context = context;
    this.#output = output;
    this.rescan();
    this.#disposables.push(
      vscode.extensions.onDidChange(() => {
        this.rescan();
      }),
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(SETTING)) this.#onDidChange.fire();
      }),
      vscode.commands.registerCommand('gitleaf.showTokenPreview', () => {
        this.showPreview();
      }),
      vscode.commands.registerCommand('gitleaf.selectAppearance', () => this.selectAppearance()),
      vscode.commands.registerCommand('gitleaf.findAppearancePacks', () =>
        vscode.commands.executeCommand('workbench.extensions.search', '@tag:gitleaf-appearance'),
      ),
      vscode.commands.registerCommand('gitleaf.installAppearancePackFromVsix', () =>
        vscode.commands.executeCommand('workbench.extensions.action.installVSIX'),
      ),
      this.#onDidChange.event(() => {
        this.#refreshPreview();
      }),
    );
  }

  get discovery(): Discovery {
    return this.#discovery;
  }

  /** The active pack, or undefined for the neutral default. A missing pack falls back silently. */
  active(): LoadedPack | undefined {
    const setting = vscode.workspace.getConfiguration().get<string>(SETTING);
    const { pack, fellBack } = resolveAppearance(setting, this.#discovery);
    if (fellBack !== undefined)
      this.#output.appendLine(
        `Appearance "${fellBack}" is not installed; using the default appearance.`,
      );
    return pack;
  }

  rescan(): void {
    this.#discovery = discoverPacks(
      vscode.extensions.all.map((e) => ({
        id: e.id,
        extensionPath: e.extensionPath,
        packageJSON: e.packageJSON as unknown,
      })),
    );
    for (const r of this.#discovery.rejected) this.#output.appendLine(formatRejection(r));
    this.#onDidChange.fire();
  }

  showPreview(): void {
    if (this.#panel) {
      this.#panel.reveal();
      return;
    }
    const media = vscode.Uri.joinPath(this.#context.extensionUri, 'media');
    const roots = [
      media,
      ...[...this.#discovery.packs.values()].map((p) => vscode.Uri.file(p.extensionPath)),
    ];
    this.#panel = vscode.window.createWebviewPanel(
      'gitleaf.tokenPreview',
      'Gitleaf: Token preview',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        localResourceRoots: roots,
        retainContextWhenHidden: true,
      },
    );
    this.#panel.onDidDispose(() => {
      this.#panel = undefined;
    });
    this.#render(this.active());
  }

  #render(pack: LoadedPack | undefined): void {
    const panel = this.#panel;
    if (!panel) return;
    const media = vscode.Uri.joinPath(this.#context.extensionUri, 'media');
    const w = panel.webview;
    const face = pack?.mascot?.map['empty-docs']?.face;
    w.html = renderPreview(
      {
        cspSource: w.cspSource,
        tokensCss: w.asWebviewUri(vscode.Uri.joinPath(media, 'tokens.css')).toString(),
        previewCss: w.asWebviewUri(vscode.Uri.joinPath(media, 'preview.css')).toString(),
        ...(pack === undefined
          ? {}
          : { packCss: w.asWebviewUri(vscode.Uri.file(pack.tokensPath)).toString() }),
        ...(pack?.mascot === undefined || face === undefined
          ? {}
          : {
              mascot: w
                .asWebviewUri(vscode.Uri.joinPath(vscode.Uri.file(pack.mascot.dir), face))
                .toString(),
            }),
      },
      previewModel(pack),
      makeNonce(),
    );
  }

  #refreshPreview(): void {
    if (this.#panel) this.#render(this.active());
  }

  /** Posts a live preview of `pack` to the open panel without changing the setting. */
  #livePreview(pack: LoadedPack | undefined): void {
    const panel = this.#panel;
    if (!panel) return;
    void panel.webview.postMessage({
      type: 'appearance',
      label: previewModel(pack).appearanceLabel,
      packCss:
        pack === undefined
          ? undefined
          : panel.webview.asWebviewUri(vscode.Uri.file(pack.tokensPath)).toString(),
    });
  }

  async selectAppearance(): Promise<void> {
    const current = this.active();
    this.showPreview();
    type Item = vscode.QuickPickItem & { pack: LoadedPack | undefined };
    const items: Item[] = [
      {
        label: 'Default (neutral)',
        description: current === undefined ? 'current' : '',
        detail: 'Structure from your theme, Gitleaf accents',
        pack: undefined,
      },
      ...[...this.#discovery.packs.values()].map((p) => ({
        label: p.label,
        description: p.id === current?.id ? 'current' : p.id,
        detail: p.description,
        pack: p,
      })),
    ];
    const picker = vscode.window.createQuickPick<Item>();
    picker.title = 'Gitleaf: Select Appearance';
    picker.placeholder =
      this.#discovery.packs.size === 0
        ? 'No appearance packs installed. Run "Gitleaf: Find Appearance Packs" to add one.'
        : 'Move to preview, Enter to apply';
    picker.items = items;
    picker.activeItems = items.filter((i) => i.pack?.id === current?.id);
    const chosen = await new Promise<Item | undefined>((resolvePick) => {
      picker.onDidChangeActive(([item]) => {
        this.#livePreview(item?.pack);
      });
      picker.onDidAccept(() => {
        resolvePick(picker.selectedItems[0]);
        picker.hide();
      });
      picker.onDidHide(() => {
        resolvePick(undefined);
        picker.dispose();
      });
      picker.show();
    });
    if (chosen === undefined) {
      this.#livePreview(current);
      return;
    }
    await vscode.workspace
      .getConfiguration()
      .update(SETTING, chosen.pack?.id ?? 'default', vscode.ConfigurationTarget.Global);
  }

  dispose(): void {
    for (const d of this.#disposables) d.dispose();
    this.#onDidChange.dispose();
    this.#panel?.dispose();
  }
}
