import { execFileSync, spawn } from 'node:child_process';
import { request } from '@playwright/test';

// Uses the authenticated CLI; secrets and browser cookies stay in memory.
// Run: npm run test:preview -- https://<chem-dex-preview>.vercel.app
const target = new URL(process.argv[2]);
if (target.protocol !== 'https:' || !target.hostname.endsWith('.vercel.app')) {
  throw new Error('Expected a Vercel HTTPS Preview URL.');
}
if (!process.env.npm_execpath) throw new Error('Run through npm run test:preview.');
const vercelApi = path => JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath,
  'exec', '--yes', '--', 'vercel', 'api', path,
  '--scope', 'duongthanhdien3456-2621s-projects'], { encoding: 'utf8' }));
const project = vercelApi('/v9/projects/prj_jlIYLO6iiLWC7KLdjQ8xXlhmmxfy');
const deployment = vercelApi(`/v13/deployments/${target.hostname}`);
if (deployment.projectId !== project.id) throw new Error('Preview belongs to another project.');
const secret = Object.entries(project.protectionBypass ?? {})
  .find(([, value]) => value.scope === 'automation-bypass')?.[0];
if (!secret) throw new Error('No automation credential; authenticate with vercel curl first.');
const client = await request.newContext({ baseURL: target.origin });
let state;
try {
  const response = await client.get('/', { headers: {
    'x-vercel-protection-bypass': secret,
    'x-vercel-set-bypass-cookie': 'true',
  } });
  if (!response.ok() || new URL(response.url()).origin !== target.origin) {
    throw new Error('Preview authentication failed.');
  }
  state = await client.storageState();
  for (const path of ['/api/health', '/api/chemistry/structure?cid=invalid',
    '/lab-2d/assets/does-not-exist.js']) {
    const check = await client.get(path);
    console.log(JSON.stringify({ path, status: check.status(),
      type: check.headers()['content-type'] }));
    if (path === '/api/health' && (!check.ok() || (await check.json()).status !== 'ok')) {
      throw new Error('Preview health API failed.');
    }
    if (path.includes('cid=invalid') && check.status() !== 400) throw new Error('API validation failed.');
    if (path.endsWith('does-not-exist.js') && check.status() !== 404) throw new Error('Missing asset did not return 404.');
  }
} finally { await client.dispose(); }
const child = spawn(process.execPath, ['node_modules/@playwright/test/cli.js', 'test',
  '--project=chromium', ...(process.platform === 'win32' ? ['--project=edge'] : []),
  '--project=webkit', '--reporter=list'], {
  stdio: 'inherit', env: { ...process.env, CHEMDEX_TEST_URL: target.origin,
    CHEMDEX_TEST_STATE: JSON.stringify(state) },
});
child.on('error', error => { console.error(error.message); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
