// Run after npm run build. Plain Node imports the actual Vercel entry without
// tsx's extension fallback; Firebase is in-memory and never receives real writes.
import { transform } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

if (!process.argv.includes('--runtime')) {
  await mkdir(new URL('../scratch/', import.meta.url), { recursive: true });
  const source = await readFile(new URL('../api/code-studio.ts', import.meta.url), 'utf8');
  const { code } = await transform(source, { loader: 'ts', format: 'esm', platform: 'node', target: 'node20' });
  await writeFile(new URL('../scratch/code-studio-api-runtime.mjs', import.meta.url), code);
  const child = spawnSync(process.execPath, [fileURLToPath(import.meta.url), '--runtime'], { cwd: new URL('../', import.meta.url), env: { ...process.env, FIREBASE_CLIENT_EMAIL: '', FIREBASE_PRIVATE_KEY: '', VITE_FIREBASE_API_KEY: '', FIREBASE_API_KEY: '' }, encoding: 'utf8', timeout: 20000 });
  process.stdout.write(child.stdout || ''); process.stderr.write(child.stderr || '');
  if (child.error) throw child.error;
  process.exitCode = child.status ?? 1;
} else {
  const originalFetch = globalThis.fetch, documents = new Map(); let writes = 0, reads = 0, denied = false;
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.hostname === 'identitytoolkit.googleapis.com') {
      // A mock which accepts missing API keys would hide the production 401 bug.
      if (!url.searchParams.get('key')) return Response.json({ error: { message: 'API_KEY_INVALID' } }, { status: 400 });
      const token = JSON.parse(init.body).idToken;
      return token === 'owner-test-token' || token === 'other-test-token' ? Response.json({ users: [{ localId: token === 'owner-test-token' ? 'test-owner' : 'other-owner' }] }) : Response.json({ error: { message: 'INVALID_ID_TOKEN' } }, { status: 400 });
    }
    if (url.hostname !== 'firestore.googleapis.com') return originalFetch(input, init);
    if (denied) return Response.json({ error: 'denied' }, { status: 403 });
    const id = url.searchParams.get('documentId') || url.pathname.split('/').at(-1);
    if (url.pathname.endsWith('/documents:commit')) {
      const {writes:batch}=JSON.parse(init.body);
      for (const write of batch) { const id=write.update.name.split('/').at(-1),current=documents.get(id); if (write.currentDocument?.exists===false && current || write.currentDocument?.updateTime && current?.updateTime!==write.currentDocument.updateTime) return Response.json({},{status:409}); }
      for (const write of batch) { writes++; documents.set(write.update.name.split('/').at(-1),{fields:write.update.fields,updateTime:'revision-'+writes}); }
      return Response.json({});
    }

    if (init?.method === 'PATCH') { const current = documents.get(id); if ((url.searchParams.get('currentDocument.exists') === 'false' && current) || (url.searchParams.has('currentDocument.updateTime') && current?.updateTime !== url.searchParams.get('currentDocument.updateTime'))) return Response.json({}, { status: 412 }); writes++; const doc = { ...JSON.parse(init.body), updateTime: 'revision-' + writes }; documents.set(id, doc); return Response.json(doc); }
    reads++; return documents.has(id) ? Response.json(documents.get(id)) : Response.json({}, { status: 404 });
  };
  const { default: app } = await import('../scratch/code-studio-api-runtime.mjs');
  const server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const project = { version: 1, id: 'production-check', name: 'Production', activeFile: 'index.html', entry: 'index.html', folders: [], files: [{ path: 'index.html', content: '<html><title>Production</title><body>Hello</body></html>' }] };
    const response = await fetch(origin + '/api/code-studio/shares?match=shares', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner-test-token' }, body: JSON.stringify({ version: 1, projectId: project.id, mode: 'website-edit', title: 'Production check', description: 'No image', payload: JSON.stringify(project) }) });
    assert.equal(response.status, 201); const result = await response.json(); assert.match(result.path, /^\/code\/production-check\.[a-f0-9]{16}$/); assert.equal(writes, 1);
    const shared = await fetch(origin + `/api/code-studio/shares/${result.id}?match=shares/${result.id}`); assert.equal(shared.status, 200); assert.equal((await shared.json()).mode, 'website-edit');
    await new Promise(resolve => setTimeout(resolve, 3100));
    const updated = await fetch(origin + '/api/code-studio/shares?match=shares', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer owner-test-token' }, body: JSON.stringify({ version: 1, projectId: project.id, shareId: result.id, mode: 'website-edit', title: 'Updated title', description: 'Latest content', payload: JSON.stringify(project) }) });
    assert.equal(updated.status, 201); assert.equal((await updated.json()).path, result.path); assert.equal(documents.size, 1); assert.equal(writes, 2);
    const latest = await fetch(origin + `/api/code-studio/shares/${result.id}?match=shares/${result.id}`); assert.equal(latest.headers.get('cache-control'), 'no-store'); assert.equal((await latest.json()).title, 'Updated title');
    await new Promise(resolve => setTimeout(resolve, 3100));
    const foreign = await fetch(origin + '/api/code-studio/shares?match=shares', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer other-test-token' }, body: JSON.stringify({ version: 1, projectId: project.id, shareId: result.id, mode: 'website-edit', title: 'Attack', description: '', payload: JSON.stringify(project) }) });
    assert.equal(foreign.status, 403); assert.equal(writes, 2);
    const page = await fetch(origin + result.path + '?slug=' + result.path.split('/').at(-1)); assert.equal(page.status, 200); const html = await page.text(); assert.ok(html.includes('<title>Updated title</title>')); assert.ok(!html.includes('property="og:image"'));
    const bad = await fetch(origin + '/api/code-studio/shares?match=shares', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(bad.status, 400); assert.ok((await bad.json()).error);
    const missing = await fetch(origin + '/api/code-studio/missing?match=missing'); assert.equal(missing.status, 404); assert.ok((await missing.json()).error);
    denied = true;
    const unavailable = await fetch(origin + `/api/code-studio/shares/${result.id}?match=shares/${result.id}`); assert.equal(unavailable.status, 503); assert.match((await unavailable.json()).error, /Firebase/);
    assert.equal(writes, 2); assert.ok(reads >= 5);
    denied=false;
    const available=await fetch(origin+'/api/code-studio/names/production-site?match=names/production-site');assert.equal((await available.json()).available,true);
    await new Promise(resolve=>setTimeout(resolve,3100));
    const named=await fetch(origin+'/api/code-studio/shares?match=shares',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer owner-test-token'},body:JSON.stringify({version:1,projectId:project.id,shareId:result.id,customSlug:'production-site',mode:'website-edit',title:'Named DkCode',description:'',payload:JSON.stringify(project)})});
    assert.equal(named.status,201);assert.equal((await named.json()).path,'/code/production-site');assert.equal(documents.size,2);
    const taken=await fetch(origin+'/api/code-studio/names/production-site?match=names/production-site');assert.equal((await taken.json()).available,false);
    const namedRead=await fetch(origin+'/api/code-studio/named/production-site?match=named/production-site');assert.equal((await namedRead.json()).title,'Named DkCode');
    const namedPage=await fetch(origin+'/code/production-site?slug=production-site');assert.equal(namedPage.status,200);assert.ok((await namedPage.text()).includes('<title>Named DkCode</title>'));
    await new Promise(resolve=>setTimeout(resolve,3100));
    const collision=await fetch(origin+'/api/code-studio/shares?match=shares',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer other-test-token'},body:JSON.stringify({version:1,projectId:'other-project',customSlug:'production-site',mode:'website-edit',title:'Collision',description:'',payload:JSON.stringify(project)})});assert.equal(collision.status,409);assert.equal(documents.size,2);
    console.log('PASS plain Node production entry: cold imports, legacy links/updates, auth and JSON errors, atomic custom name migration, availability, named read/metadata and collision 409; Firebase mocked');
  } finally { await new Promise(resolve => server.close(resolve)); }
}
