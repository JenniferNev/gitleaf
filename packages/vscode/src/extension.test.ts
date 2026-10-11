import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  const disposable = () => ({ dispose: () => undefined });
  class Emitter {
    event = () => disposable();
    fire(): void {
      // no-op
    }
    dispose(): void {
      // no-op
    }
  }
  return {
    McpStdioServerDefinition: class {
      constructor(
        public label: string,
        public command: string,
        public args: string[],
        public env: Record<string, string>,
      ) {}
    },
    EventEmitter: Emitter,
    Diagnostic: class {
      constructor(
        public range: unknown,
        public message: string,
        public severity: number,
      ) {}
    },
    Range: class {
      constructor(
        public a: number,
        public b: number,
        public c: number,
        public d: number,
      ) {}
    },
    DiagnosticSeverity: { Error: 0, Warning: 1 },
    TreeItem: class {
      constructor(public label: string) {}
    },
    TreeItemCollapsibleState: { None: 0, Collapsed: 1 },
    ThemeIcon: class {
      constructor(public id: string) {}
    },
    ViewColumn: { Beside: 2 },
    ConfigurationTarget: { Global: 1 },
    workspace: {
      workspaceFolders: [],
      isTrusted: true,
      onDidChangeWorkspaceFolders: disposable,
      onDidChangeConfiguration: disposable,
      getConfiguration: () => ({ get: () => 'default', update: () => Promise.resolve() }),
      createFileSystemWatcher: () => ({
        onDidChange: disposable,
        onDidCreate: disposable,
        onDidDelete: disposable,
        dispose: () => undefined,
      }),
    },
    languages: {
      createDiagnosticCollection: () => ({
        clear: () => undefined,
        set: () => undefined,
        dispose: () => undefined,
      }),
    },
    window: {
      createOutputChannel: () => ({ appendLine: () => undefined, dispose: () => undefined }),
      registerTreeDataProvider: disposable,
      showInformationMessage: () => Promise.resolve(undefined),
      showWarningMessage: () => Promise.resolve(undefined),
    },
    extensions: { all: [], onDidChange: disposable },
    commands: { registerCommand: disposable, executeCommand: () => Promise.resolve() },
    Uri: { joinPath: () => ({}), file: () => ({}) },
    lm: { registerMcpServerDefinitionProvider: disposable },
  };
});

const { serverDefinitions, activate, deactivate } = await import('./extension.js');

describe('extension', () => {
  it('defines one MCP server per workspace folder, pointing at the bundled server', () => {
    const defs = serverDefinitions('/ext', [
      { name: 'a', fsPath: '/w/a' },
      { name: 'b', fsPath: '/w/b' },
    ]);
    expect(defs.map((d) => [d.label, d.command, d.args, d.env])).toEqual([
      ['Gitleaf (a)', 'node', ['/ext/dist/gitleaf-mcp.js'], { GITLEAF_CWD: '/w/a' }],
      ['Gitleaf (b)', 'node', ['/ext/dist/gitleaf-mcp.js'], { GITLEAF_CWD: '/w/b' }],
    ]);
    expect(serverDefinitions('/ext', [{ name: 'only', fsPath: '/w' }])[0]?.label).toBe('Gitleaf');
  });

  it('activates and deactivates with a minimal context', () => {
    const subscriptions: { dispose(): unknown }[] = [];
    expect(() => {
      activate({ subscriptions, extensionPath: '/ext' } as never);
      deactivate();
    }).not.toThrow();
    expect(subscriptions.length).toBeGreaterThan(0);
  });
});
