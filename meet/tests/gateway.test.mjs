import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(new URL('../api/index.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { default: handler } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);
function response() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; }, send(body) { this.body = body; return this; },
  };
}
test('Vercel reports missing setup and safely discovers the backend without exposing keys', async () => {
  const previous = { backend: process.env.REALTIME_SERVER_URL, legacy: process.env.VITE_SERVER_URL };
  try {
    delete process.env.REALTIME_SERVER_URL; delete process.env.VITE_SERVER_URL;
    const empty = response();
    await handler({ method: 'GET', url: '/api/config', headers: { host: 'meet.example.com' } }, empty);
    assert.equal(empty.statusCode, 200); assert.equal(empty.body.configured, false);
    assert.equal(empty.body.code, 'BACKEND_NOT_CONFIGURED');
    const missing = response();
    await handler({ method: 'POST', url: '/api/rooms', headers: { host: 'meet.example.com' } }, missing);
    assert.equal(missing.statusCode, 503);
    assert.match(missing.body.error, /REALTIME_SERVER_URL/);
    for (const invalid of ['http://localhost:5000', 'https://meet.example.com', 'https://secret:password@backend.example.com', 'invalid']) {
      process.env.REALTIME_SERVER_URL = invalid;
      const res = response();
      await handler({ method: 'GET', url: '/api/config', headers: { host: 'meet.example.com' } }, res);
      assert.equal(res.body.configured, false);
    }
    process.env.REALTIME_SERVER_URL = 'https://meetclass-realtime.onrender.com';
    const valid = response();
    await handler({ method: 'GET', url: '/api/config', headers: { host: 'meet.example.com' } }, valid);
    assert.deepEqual(valid.body, { configured: true, serverUrl: 'https://meetclass-realtime.onrender.com' });
    assert.equal(valid.headers['Cache-Control'], 'no-store');
  } finally {
    if (previous.backend === undefined) delete process.env.REALTIME_SERVER_URL; else process.env.REALTIME_SERVER_URL = previous.backend;
    if (previous.legacy === undefined) delete process.env.VITE_SERVER_URL; else process.env.VITE_SERVER_URL = previous.legacy;
  }
});
