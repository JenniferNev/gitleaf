import { describe, expect, it } from 'vitest';
import { main, VERSION } from './index.js';

function io() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    io: { out: { write: (s: string) => out.push(s) }, err: { write: (s: string) => err.push(s) } },
    out: () => out.join(''),
    err: () => err.join(''),
  };
}

describe('gitleaf cli', () => {
  it('prints the version', async () => {
    const t = io();
    expect(await main(['--version'], t.io)).toBe(0);
    expect(t.out()).toBe(`${VERSION}\n`);
  });

  it('prints usage and exits 2 without a command', async () => {
    const t = io();
    expect(await main([], t.io)).toBe(2);
    expect(t.out()).toContain('Usage: gitleaf');
  });

  it('rejects unknown commands and flags', async () => {
    expect(await main(['frobnicate'], io().io)).toBe(2);
    expect(await main(['validate', '--nope'], io().io)).toBe(2);
  });

  it('validate exits 0 and supports --json', async () => {
    const t = io();
    expect(await main(['validate', '--json', 'docs'], t.io)).toBe(0);
    expect(JSON.parse(t.out())).toEqual({ checked: 0, errors: [], warnings: [] });
  });
});
