import type { EntityId } from './domain.js';
import type { IdGenerator } from './ports.js';

/** Crockford base32: digits and uppercase letters without I, L, O and U. */
export const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

export const ID_LENGTH = 8;

const ID_PATTERN = new RegExp(`^[A-Z]{2,4}-[${CROCKFORD_ALPHABET}]{${String(ID_LENGTH)}}$`);

export function isEntityId(value: string): value is EntityId {
  return ID_PATTERN.test(value);
}

/** Builds `<TYPE>-<random>` from a type prefix and an `IdGenerator`. */
export function makeId(prefix: string, ids: IdGenerator): EntityId {
  return `${prefix}-${ids.next()}`;
}

/**
 * An `IdGenerator` over any source of random bytes. Core owns the alphabet and
 * length; the caller (an adapter or driver) owns the randomness.
 */
export function idGeneratorFrom(randomBytes: (n: number) => Uint8Array): IdGenerator {
  return {
    next() {
      const bytes = randomBytes(ID_LENGTH);
      let out = '';
      for (let i = 0; i < ID_LENGTH; i++) {
        out += CROCKFORD_ALPHABET.charAt((bytes[i] ?? 0) % CROCKFORD_ALPHABET.length);
      }
      return out;
    },
  };
}
