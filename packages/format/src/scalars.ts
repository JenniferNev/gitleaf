import { Document, isScalar, Scalar } from 'yaml';
import type { FrontmatterValue } from './types.js';

/**
 * Strings that YAML 1.1 readers (and humans) misread unless quoted. YAML 1.2
 * core schema would keep most of them as strings, but files are read by many
 * tools, so Gitleaf always quotes them. See .claude/rules/file-formats.md.
 */
const GOTCHA = /^(?:y|yes|n|no|on|off|true|false|null|~)$/i;
const LEADING_ZERO = /^[-+]?0\d/;
const VERSION_LIKE = /^[-+]?\d+(?:\.\d+)+$/;
const NUMERIC = /^[-+]?(?:\d[\d_]*|\.\d+|\d+\.\d*)(?:[eE][-+]?\d+)?$/;
const SPECIAL_FLOAT = /^[-+]?\.(?:inf|nan)$/i;
const HEX_OCT_BIN = /^[-+]?0[xob]/i;

export function needsQuotes(s: string): boolean {
  return (
    s === '' ||
    GOTCHA.test(s) ||
    LEADING_ZERO.test(s) ||
    VERSION_LIKE.test(s) ||
    NUMERIC.test(s) ||
    SPECIAL_FLOAT.test(s) ||
    HEX_OCT_BIN.test(s) ||
    s !== s.trim()
  );
}

const STRINGIFY = { lineWidth: 0, minContentWidth: 0 } as const;

/**
 * Serializes one value as YAML text without a trailing newline.
 * Scalars and flow collections stay on one line, so a one-field update is a
 * one-line diff. Strings with line breaks become block scalars and span lines.
 */
export function inlineYaml(value: FrontmatterValue, flow: boolean): string {
  if (typeof value === 'string') {
    if (needsQuotes(value) && !value.includes('\n')) return JSON.stringify(value);
    return new Document(value).toString(STRINGIFY).replace(/\n$/, '');
  }
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return new Document(value).toString(STRINGIFY).replace(/\n$/, '');
  }
  const doc = new Document(value);
  quoteGotchas(doc.contents);
  if (flow && (Array.isArray(value) || typeof value === 'object')) {
    (doc.contents as { flow?: boolean }).flow = true;
    flowEverything(doc.contents);
  }
  return doc.toString(STRINGIFY).replace(/\n$/, '');
}

/** Block-style YAML for a whole mapping, used for new documents. Ends with a newline. */
export function blockYaml(mapping: Readonly<Record<string, FrontmatterValue>>): string {
  if (Object.keys(mapping).length === 0) return '';
  const doc = new Document(mapping);
  quoteGotchas(doc.contents);
  return doc.toString(STRINGIFY);
}

function quoteGotchas(node: unknown): void {
  if (isScalar(node)) {
    if (typeof node.value === 'string' && needsQuotes(node.value) && !node.value.includes('\n')) {
      node.type = Scalar.QUOTE_DOUBLE;
    }
    return;
  }
  if (hasItems(node)) {
    for (const item of node.items) {
      if (item && typeof item === 'object' && 'key' in item && 'value' in item) {
        quoteGotchas(item.key);
        quoteGotchas(item.value);
      } else {
        quoteGotchas(item);
      }
    }
  }
}

function hasItems(node: unknown): node is { items: unknown[]; flow?: boolean } {
  return typeof node === 'object' && node !== null && 'items' in node && Array.isArray(node.items);
}

function flowEverything(node: unknown): void {
  if (hasItems(node)) {
    node.flow = true;
    for (const item of node.items) {
      if (item && typeof item === 'object' && 'value' in item) flowEverything(item.value);
      else flowEverything(item);
    }
  }
}
