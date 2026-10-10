import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CROCKFORD_ALPHABET, ID_LENGTH, idGeneratorFrom, isEntityId, makeId } from './ids.js';

describe('entity ids', () => {
  it('accepts the backlog id format', () => {
    expect(isEntityId('ST-37MPP7WD')).toBe(true);
    expect(isEntityId('EP-0RQVJECD')).toBe(true);
  });

  it('rejects sequential keys and ambiguous letters', () => {
    expect(isEntityId('SHOP-123')).toBe(false);
    expect(isEntityId('ST-ILOU1234')).toBe(false);
    expect(isEntityId('st-37mpp7wd')).toBe(false);
  });

  it('generates ids from any byte source', () => {
    let seed = 0;
    const ids = idGeneratorFrom((n) => Uint8Array.from({ length: n }, () => seed++));
    const id = makeId('ST', ids);
    expect(id).toBe(`ST-${CROCKFORD_ALPHABET.slice(0, ID_LENGTH)}`);
    expect(isEntityId(id)).toBe(true);
  });
});

describe('dependency rule', () => {
  it('core declares no runtime dependencies', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      dependencies?: Record<string, string>;
    };
    expect(pkg.dependencies ?? {}).toEqual({});
  });
});
