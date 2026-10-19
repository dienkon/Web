import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
await mkdir('.browser-review/practical-tests',{recursive:true});
const outfile=path.resolve('.browser-review/practical-tests/core.cjs');
await build({entryPoints:['scripts/practical-core-checks.ts'],outfile,bundle:true,platform:'node',format:'cjs',logLevel:'warning',define:{'import.meta.env.DEV':'false'}});
await import(pathToFileURL(outfile).href);
