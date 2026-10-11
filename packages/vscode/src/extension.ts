/**
 * Gitleaf for VS Code: extension entry point.
 *
 * Registers the Gitleaf MCP server for Copilot through the
 * mcpServerDefinitionProviders contribution. Views, commands and the appearance
 * loader arrive with their stories.
 */
import { join } from 'node:path';
import * as vscode from 'vscode';

export const MCP_PROVIDER_ID = 'gitleaf.mcp';

/** One server definition per workspace folder, so each repo's gitleaf.yaml is honored. */
export function serverDefinitions(
  extensionPath: string,
  folders: readonly { readonly name: string; readonly fsPath: string }[],
): vscode.McpStdioServerDefinition[] {
  const server = join(extensionPath, 'dist', 'gitleaf-mcp.js');
  return folders.map(
    (f) =>
      new vscode.McpStdioServerDefinition(
        folders.length === 1 ? 'Gitleaf' : `Gitleaf (${f.name})`,
        'node',
        [server],
        {
          GITLEAF_CWD: f.fsPath,
        },
      ),
  );
}

export function activate(context: vscode.ExtensionContext): void {
  const changed = new vscode.EventEmitter<void>();
  context.subscriptions.push(
    changed,
    vscode.workspace.onDidChangeWorkspaceFolders(() => {
      changed.fire();
    }),
    vscode.lm.registerMcpServerDefinitionProvider(MCP_PROVIDER_ID, {
      onDidChangeMcpServerDefinitions: changed.event,
      provideMcpServerDefinitions: () =>
        serverDefinitions(
          context.extensionPath,
          (vscode.workspace.workspaceFolders ?? []).map((f) => ({
            name: f.name,
            fsPath: f.uri.fsPath,
          })),
        ),
    }),
  );
}

export function deactivate(): void {
  // Nothing to dispose beyond context.subscriptions.
}
