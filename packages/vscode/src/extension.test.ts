import { expect, it } from 'vitest';
import { activate, deactivate } from './extension.js';

it('activates and deactivates without touching the vscode API', () => {
  // The extension receives a real ExtensionContext at runtime. The stub ignores it.
  expect(() => {
    activate({} as never);
    deactivate();
  }).not.toThrow();
});
