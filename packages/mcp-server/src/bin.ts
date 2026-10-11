import { loadWorkspace, NodeWorkspaceStore } from '@gitleaf/adapter-fs-node';
import { GitCliVcs } from '@gitleaf/adapter-git-cli';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer, type ServerDeps } from './server.js';

/** Resolves the workspace for a cwd and builds the server's dependencies. */
export function depsFor(cwd: string): ServerDeps {
  const ws = loadWorkspace(cwd);
  return {
    store: new NodeWorkspaceStore(ws.repos),
    vcs: new GitCliVcs(ws.repos),
    repos: ws.repos,
    config: ws.config,
    configDiagnostics: ws.diagnostics,
  };
}

/** `gitleaf-mcp [--cwd <dir>]`; the GITLEAF_CWD environment variable is used when no flag is given. */
export async function main(argv: readonly string[]): Promise<void> {
  const i = argv.indexOf('--cwd');
  const cwd = (i !== -1 ? argv[i + 1] : undefined) ?? process.env.GITLEAF_CWD ?? process.cwd();
  const server = createServer(depsFor(cwd));
  await server.connect(new StdioServerTransport());
}
