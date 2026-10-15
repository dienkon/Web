import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const folder = path.resolve('.browser-review/academy-tests');
await mkdir(folder, { recursive: true });
const bundle = path.join(folder, 'academy-core-checks.cjs');
await build({
  entryPoints: ['scripts/academy-core-checks.ts'],
  outfile: bundle,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  logLevel: 'warning',
});
const module = await import(pathToFileURL(bundle).href);
await mkdir('docs/academy-upgrade', { recursive: true });
await writeFile('docs/academy-upgrade/core-checks.json', JSON.stringify(module.report ?? module.default.report, null, 2));
