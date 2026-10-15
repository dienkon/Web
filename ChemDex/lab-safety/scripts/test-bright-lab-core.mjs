import { build } from 'esbuild';
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const directory = path.resolve('.browser-review/bright-lab-tests');
await mkdir(directory, { recursive: true });
const output = path.join(directory, 'checks.cjs');
await build({
  entryPoints: ['scripts/bright-lab-core-checks.ts'],
  outfile: output,
  bundle: true,
  platform: 'node',
  format: 'cjs',
  logLevel: 'warning',
});
const result = await import(pathToFileURL(output).href);
await mkdir('docs/bright-lab', { recursive: true });
await writeFile('docs/bright-lab/core-checks.json', JSON.stringify(result.report ?? result.default.report, null, 2));
