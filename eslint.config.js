// @ts-check
import { builtinModules } from 'node:module';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Node built-ins, with and without the `node:` prefix. */
const nodeBuiltins = [...new Set(builtinModules.flatMap((m) => [m, `node:${m}`]))];

export default tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'packages/themes/**', '**/*.d.ts'],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // Dependency rule (AGENTS.md): core depends on nothing. Tests may use Node to inspect the package.
    files: ['packages/core/**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            ...nodeBuiltins.map((name) => ({
              name,
              message:
                'packages/core is pure TypeScript: no Node built-ins. Put I/O behind a port.',
            })),
            {
              name: 'vscode',
              message: 'packages/core must not import vscode. Only packages/vscode may.',
            },
          ],
          patterns: [
            {
              group: ['@gitleaf/adapter-*', '**/adapters/**'],
              message:
                'packages/core must not import adapters. Adapters implement core ports, not the reverse.',
            },
            {
              group: ['@gitleaf/vscode', '@gitleaf/cli', '@gitleaf/mcp-server'],
              message: 'packages/core must not import a driver.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    files: ['eslint.config.js', 'vitest.config.ts', 'packages/*/bin/*.js'],
    extends: [tseslint.configs.disableTypeChecked],
  },
  prettier,
);
