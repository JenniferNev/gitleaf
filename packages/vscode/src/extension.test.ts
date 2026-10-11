import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  McpStdioServerDefinition: class {
    constructor(
      public label: string,
      public command: string,
      public args: string[],
      public env: Record<string, string>,
    ) {}
  },
  EventEmitter: class {
    event = () => ({ dispose: () => undefined });
    fire(): void {
      // no-op
    }
    dispose(): void {
      // no-op
    }
  },
  workspace: {
    workspaceFolders: [],
    onDidChangeWorkspaceFolders: () => ({ dispose: () => undefined }),
    onDidChangeConfiguration: () => ({ dispose: () => undefined }),
    getConfiguration: () => ({ get: () => 'default', update: () => Promise.resolve() }),
  },
  window: {
    createOutputChannel: () => ({ appendLine: () => undefined, dispose: () => undefined }),
  },
  extensions: { all: [], onDidChange: () => ({ dispose: () => undefined }) },
  commands: {
    registerCommand: () => ({ dispose: () => undefined }),
    executeCommand: () => Promise.resolve(),
  },
  Uri: { joinPath: () => ({}), file: () => ({}) },
  lm: { registerMcpServerDefinitionProvider: () => ({ dispose: () => undefined }) },
}));

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
