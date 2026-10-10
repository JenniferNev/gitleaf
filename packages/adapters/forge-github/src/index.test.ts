import { expect, it } from 'vitest';
import { PACKAGE } from './index.js';

it('exports its package name', () => {
  expect(PACKAGE).toBe('@gitleaf/adapter-forge-github');
});
