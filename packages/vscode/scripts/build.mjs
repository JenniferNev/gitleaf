// Bundles the extension (CJS, for the extension host) and the MCP server (ESM, for node),
// then copies the shipped skills next to the extension. See docs/adr/2026-10-11-extension-bundling.md.
import { build } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = resolve(here, '..');
const repo = resolve(pkg, '..', '..');
const watch = process.argv.includes('--watch');
const production = process.argv.includes('--production');

// Start clean so nothing from an older build (tsc output, old bundles) ends up in the VSIX.
rmSync(resolve(pkg, 'dist'), { recursive: true, force: true });

const common = {
  bundle: true,
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
  target: 'node20',
};

await build({
  ...common,
  entryPoints: [resolve(pkg, 'src/extension.ts')],
  outfile: resolve(pkg, 'dist/extension.js'),
  format: 'cjs',
  platform: 'node',
  external: ['vscode'],
});

const serverOut = [
  resolve(pkg, 'dist/gitleaf-mcp.js'),
  resolve(repo, 'plugins/claude/server/gitleaf-mcp.js'),
];
for (const outfile of serverOut) {
  mkdirSync(dirname(outfile), { recursive: true });
  await build({
    ...common,
    entryPoints: [resolve(repo, 'packages/mcp-server/src/bin-entry.ts')],
    outfile,
    format: 'esm',
    platform: 'node',
    banner: {
      js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);",
    },
  });
}

const skillsOut = resolve(pkg, 'skills');
rmSync(skillsOut, { recursive: true, force: true });
cpSync(resolve(repo, 'plugins/claude/skills'), skillsOut, { recursive: true });
console.log(`copied skills to ${skillsOut}`);
if (watch) console.log('watch mode is not wired yet; re-run the build');
