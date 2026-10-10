import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Map every workspace package name to its `src/index.ts`, so tests exercise
 * source directly and never a stale `dist/`.
 */
function workspaceAliases(): Record<string, string> {
  const roots = ['packages', 'packages/adapters'];
  const aliases: Record<string, string> = {};
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const pkgJson = join(root, dir.name, 'package.json');
      const entry = join(root, dir.name, 'src', 'index.ts');
      if (!existsSync(pkgJson) || !existsSync(entry)) continue;
      const { name } = JSON.parse(readFileSync(pkgJson, 'utf8')) as { name: string };
      aliases[name] = join(process.cwd(), entry);
    }
  }
  return aliases;
}

export default defineConfig({
  resolve: { alias: workspaceAliases() },
  test: {
    include: ['packages/**/src/**/*.test.ts', 'packages/**/test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    passWithNoTests: false,
  },
});
