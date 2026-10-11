/**
 * Stdio MCP server shared by Copilot (through the extension's
 * mcpServerDefinitionProvider) and Claude Code (through plugins/claude/.mcp.json).
 */
export {
  createServer,
  GitleafTools,
  TOOLS,
  REFUSAL_MESSAGE,
  SERVER_NAME,
  SERVER_VERSION,
  untrusted,
} from './server.js';
export type { ServerDeps } from './server.js';
export { search } from './search.js';
export type { SearchHit } from './search.js';
export { depsFor, main } from './bin.js';
