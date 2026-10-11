/**
 * Line-level provenance: who wrote each line, human or agent, from git blame,
 * commit trailers and Agent Trace notes. See docs/adr/2026-10-09-line-provenance.md.
 */
export {
  GitProvenance,
  classifyCommit,
  coalesce,
  AGENT_TRACE_NOTES_REF,
  UNCOMMITTED_COMMIT,
} from './provenance.js';
export type { CommitClassification, GitProvenanceOptions } from './provenance.js';
export { DEFAULT_AGENT_PATTERNS, agentOf, parseIdentity } from './agents.js';
export type { AgentIdentity, AgentPattern } from './agents.js';
export { parseTraceNote, lookupTrace, isTraceRecord, toKind } from './agent-trace.js';
export type {
  TraceRecord,
  TraceFile,
  TraceConversation,
  TraceRange,
  TraceContributor,
  TraceHit,
} from './agent-trace.js';
