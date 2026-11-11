const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.join(__dirname, '..');
const ROOT = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const OP = 'test-operation-00000001';

function gas() {
  const properties = new Map(), rows = [], requests = [];
  let locked = false, serial = 0;
  const tree = new Map([[ROOT, { name: 'Root', parents: [] }], ['child', { name: 'Child', parents: [ROOT] }],
    ['outside', { name: 'Private', parents: [] }], ['trash', { name: 'Trash', parents: [ROOT], trash: true }],
    ['deep', { name: 'Deep', parents: ['trash'] }]]);
  const props = { getProperty: key => properties.get(key) || null, setProperty: (key, value) => properties.set(key, value),
    deleteProperty: key => properties.delete(key), getProperties: () => Object.fromEntries(properties) };
  const sheet = { appendRow: values => rows.push(values), getLastRow: () => rows.length,
    getRange: (row, col, count = 1) => ({ getValue: () => rows[row - 1][col - 1], setValue: value => { rows[row - 1][col - 1] = value; },
      getValues: () => rows.slice(row - 1, row - 1 + count) }), getParent: () => ({ getUrl: () => 'https://docs.google.com/mock' }) };
  const folder = id => {
    const data = tree.get(id); if (!data) throw new Error('Folder missing');
    return { getId: () => id, getName: () => data.name, isTrashed: () => !!data.trash, getLastUpdated: () => new Date('2026-11-11T00:00:00Z'),
      getParents: () => { let i = 0; return { hasNext: () => i < data.parents.length, next: () => folder(data.parents[i++]) }; } };
  };
  const res = (code, data = {}, headers = {}) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(data), getAllHeaders: () => headers });
  const context = vm.createContext({ console: { log() {} },
    DriveApp: { getFolderById: folder }, ScriptApp: { getOAuthToken: () => 'server-only-token', AuthMode: { FULL: 'FULL' },
      requireScopes: (mode, scopes) => { assert.equal(mode, 'FULL'); assert.ok(scopes.includes('https://www.googleapis.com/auth/script.external_request')); } },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: value => ({ setMimeType: () => JSON.parse(value) }) },
    PropertiesService: { getScriptProperties: () => props },
    LockService: { getScriptLock: () => ({ waitLock: () => { assert.equal(locked, false); locked = true; }, releaseLock: () => { locked = false; } }) },
    SpreadsheetApp: { create: () => ({ getId: () => 'ledger', getSheets: () => [sheet] }), openById: () => ({ getSheets: () => [sheet] }) },
    Utilities: { base64Decode: data => Array.from(Buffer.from(data, 'base64')) },
    UrlFetchApp: { fetch: (url, opts) => { requests.push({ url, opts }); return context.fetchResponse(url, opts); } },
    fetchResponse: (url, opts) => {
      if (url.includes('uploadType=resumable')) return res(200, {}, { Location: 'https://www.googleapis.com/upload/session/abc' });
      if (opts.method === 'post') {
        const meta = JSON.parse(opts.payload);
        return res(200, { id: `file${++serial}`, name: meta.name, mimeType: meta.mimeType, modifiedTime: '2026-11-11' });
      }
      if (opts.method === 'put') return res(308, {}, { Range: 'bytes=0-262143' });
      return res(200, { files: [{ id: 'generic', name: 'data.zip', mimeType: 'application/zip' }], nextPageToken: 'next' });
    },
  });
  vm.runInContext(fs.readFileSync(path.join(base, 'google-apps-script.gs'), 'utf8'), context);
  context.setup();
  requests.length = 0;
  return { context, properties, rows, requests, res, tree, post: body => context.doPost({ postData: { contents: JSON.stringify(body) } }),
    get: params => context.doGet({ parameter: params }) };
}

test('public API rejects folders outside the root and trashed ancestors', () => {
  const g = gas();
  for (const id of ['outside', 'trash', 'deep', "child' or true", 'unknown']) {
    assert.equal(g.get({ action: 'folder', id }).ok, false);
    assert.equal(g.post({ action: 'createFolder', parentId: id, folderName: 'X', operationId: OP }).ok, false);
  }
  assert.equal(g.requests.length, 0);
});

test('setup requires external-request consent and verifies the real API call', () => {
  const g = gas();
  g.context.ScriptApp.requireScopes = () => { throw new Error('Authorization required'); };
  assert.throws(() => g.context.setup(), /Authorization required/);
  assert.equal(g.requests.length, 0);
  g.context.ScriptApp.requireScopes = () => {};
  g.context.fetchResponse = () => { throw new Error('Missing script.external_request'); };
  assert.throws(() => g.context.setup(), /Missing script.external_request/);
});

test('live listing retains all file types and forwards pagination', () => {
  const g = gas(), result = g.get({ action: 'folder', id: 'child', pageToken: 'opaque/token' });
  assert.equal(result.ok, true);
  assert.equal(result.folder.items[0][2], 2);
  assert.equal(result.nextPageToken, 'next');
  assert.match(g.requests[0].url, /pageToken=opaque%2Ftoken/);
  assert.match(g.requests[0].url, /trashed%20%3D%20false/);
});

test('folder creation is idempotent and logged once', () => {
  const g = gas(), body = { action: 'createFolder', parentId: 'child', folderName: 'New album', operationId: OP };
  const first = g.post(body), second = g.post(body);
  assert.equal(first.ok, true); assert.equal(second.folder.id, first.folder.id);
  assert.equal(g.requests.length, 1);
  const events = g.get({ action: 'history' }).events;
  assert.equal(events.length, 1); assert.equal(events[0].action, 'createFolder');
});

test('resumable sessions keep token and session URL private; retries are idempotent', () => {
  const g = gas(), body = { action: 'uploadStart', folderId: 'child', fileName: 'arbitrary.bin', mimeType: 'application/octet-stream', size: 2 ** 35, operationId: OP };
  const first = g.post(body), second = g.post(body);
  assert.equal(first.ok, true); assert.equal(second.ok, true);
  assert.equal(g.requests.length, 1, 'large files have no application size cap');
  const output = JSON.stringify([first, g.get({ action: 'history' })]);
  assert.doesNotMatch(output, /server-only-token|upload\/session|www.googleapis.com/);
  assert.equal(g.post({ ...body, fileName: 'different' }).ok, false);
});

test('chunk acknowledgement and completion update persistent history', () => {
  const g = gas();
  g.post({ action: 'uploadStart', folderId: 'child', fileName: 'x.zip', size: 262145, operationId: OP });
  const progress = g.post({ action: 'uploadChunk', operationId: OP, offset: 0, base64Data: Buffer.alloc(262144).toString('base64') });
  assert.equal(progress.offset, 262144); assert.equal(progress.done, false);
  g.context.fetchResponse = () => g.res(200, { id: 'uploaded', name: 'x.zip', mimeType: 'application/zip', modifiedTime: 'now' });
  const done = g.post({ action: 'uploadChunk', operationId: OP, offset: 262144, base64Data: 'AA==' });
  assert.equal(done.done, true); assert.equal(done.file[2], 2);
  assert.equal(g.get({ action: 'history' }).events[0].status, 'success');
  assert.equal(g.post({ action: 'uploadStatus', operationId: OP }).done, true);
});

test('invalid chunk ranges and failed Drive calls cannot report success', () => {
  const g = gas();
  g.post({ action: 'uploadStart', folderId: 'child', fileName: 'x.bin', size: 600000, operationId: OP });
  for (const offset of [-1, 1, 600001]) assert.equal(g.post({ action: 'uploadChunk', operationId: OP, offset, base64Data: 'AA==' }).ok, false);
  assert.equal(g.post({ action: 'uploadChunk', operationId: OP, offset: 0, base64Data: 'AA==' }).ok, false, 'nonfinal chunks must align');
  g.context.fetchResponse = () => g.res(403, { error: { message: 'Quota exceeded' } });
  assert.match(g.post({ action: 'uploadStatus', operationId: OP }).error, /Quota exceeded/);
  assert.equal(g.get({ action: 'history' }).events[0].status, 'uploading');
});

test('zero-byte files are created once and recorded as completed', () => {
  const g = gas(), body = { action: 'uploadStart', operationId: OP, folderId: 'child', fileName: 'empty.txt', size: 0 };
  assert.equal(g.post(body).done, true); assert.equal(g.post(body).done, true);
  assert.equal(g.requests.length, 1);
  const event = g.get({ action: 'history' }).events[0];
  assert.equal(event.size, 0); assert.equal(event.status, 'success');
});

test('history pagination never drops older events or exposes private session data', () => {
  const g = gas();
  g.context.setup();
  for (let i = 0; i < 121; i++) g.context.appendHistory({ id: `${i}`, name: `file${i}`, createdAt: '2026-11-11', url: 'private', action: 'upload' });
  const all = []; let before;
  do {
    const page = g.get({ action: 'history', before }); all.push(...page.events); before = page.nextBefore;
  } while (before);
  assert.equal(all.length, 121); assert.equal(new Set(all.map(x => x.id)).size, 121);
  assert.equal(all[0].id, '120'); assert.equal(all[120].id, '0');
  assert.doesNotMatch(JSON.stringify(all), /private/);
});

function frontend(storage = new Map()) {
  const context = vm.createContext({ console, localStorage: { getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }, window: { DRIVE_CONFIG: {} },
    document: { addEventListener() {}, hidden: false }, navigator: { onLine: true }, crypto: {}, location: { href: 'http://localhost/' }, setTimeout, clearTimeout,
    AbortSignal, URL, fetch() { throw new Error('Unexpected real network request'); } });
  const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]);
  for (const script of scripts) vm.runInContext(script, context);
  vm.runInContext(fs.readFileSync(path.join(base, 'drive-live.js'), 'utf8'), context);
  vm.runInContext('repaintLiveData = () => {}; setDriveStatus = () => {};', context);
  return context;
}

test('frontend replaces real listings, prunes deleted descendants and recomputes counts', async () => {
  const c = frontend();
  c.driveRequest = async () => ({ ok: true, folder: { id: ROOT, n: 'Live root', f: [{ id: 'child', n: 'Album' }], items: [['file', 'Other.zip', 2, '']] } });
  await c.refreshLiveFolder(ROOT);
  c.driveRequest = async () => ({ ok: true, folder: { id: 'child', n: 'Album', f: [], items: [['img', 'Photo.jpg', 0, '']] } });
  await c.refreshLiveFolder('child');
  assert.equal(vm.runInContext('driveRoot.totalImages', c), 1);
  assert.equal(vm.runInContext('ROOT_VIRTUAL_NODE.to', c), 1);
  c.driveRequest = async () => ({ ok: true, folder: { id: ROOT, n: 'Renamed', f: [], items: [] } });
  await c.refreshLiveFolder(ROOT);
  assert.equal(vm.runInContext("folderById.has('child')", c), false);
  assert.equal(vm.runInContext('driveRoot.totalImages', c), 0);
});

test('failed pagination preserves last successful listing', async () => {
  const c = frontend();
  c.driveRequest = async () => ({ ok: true, folder: { id: ROOT, n: 'Root', f: [], items: [['old', 'Original.jpg', 0, '']] } });
  await c.refreshLiveFolder(ROOT);
  c.driveRequest = async (action, data) => {
    if (data.pageToken) throw new Error('Offline');
    return { ok: true, folder: { id: ROOT, n: 'Root', f: [], items: [] }, nextPageToken: 'page2' };
  };
  await assert.rejects(c.refreshLiveFolder(ROOT), /Offline/);
  assert.equal(vm.runInContext('ROOT_VIRTUAL_NODE.items[0][0]', c), 'old');
});

test('cached Drive data restores before network and fresh folders need no new request', async () => {
  const storage = new Map(), c = frontend(storage);
  c.driveRequest = async () => ({ ok: true, folder: { id: ROOT, n: 'Live root', f: [], items: [['img', 'Live.jpg', 0, '']] } });
  await c.refreshLiveFolder(ROOT);
  c.saveDriveCache();
  const next = frontend(storage);
  assert.equal(next.restoreDriveCache(), true);
  assert.equal(vm.runInContext('driveRoot.totalImages', next), 1);
  let requests = 0;
  next.driveRequest = async () => { requests++; return { ok: true, folder: { id: ROOT, n: 'Live root', f: [], items: [] } }; };
  await next.ensureLiveFolder(ROOT);
  assert.equal(requests, 0, 'warm navigation uses the last actual Drive listing');
  await next.refreshLiveFolder(ROOT);
  assert.equal(requests, 1, 'manual/write refresh bypasses the cached listing');
  assert.equal(vm.runInContext('driveRoot.totalImages', next), 0);
});

test('polling waits ten minutes and returning to the tab does not trigger repeated scans', async () => {
  const c = frontend(); let requests = 0;
  c.driveRequest = async () => { requests++; return { ok: true, folder: { id: ROOT, n: 'Root', f: [], items: [] } }; };
  vm.runInContext('liveState.lastPoll = Date.now(); liveState.lastScan = Date.now();', c);
  await c.pollLiveDrive(); await c.pollLiveDrive();
  assert.equal(requests, 0);
  vm.runInContext('liveState.lastPoll -= 10 * 60 * 1000;', c);
  await c.pollLiveDrive();
  assert.equal(requests, 1);
  await c.pollLiveDrive();
  assert.equal(requests, 1);
});

test('expired or malformed caches are ignored', () => {
  for (const root of [{ id: ROOT, n: 'Old', f: [], items: [] }, { id: ROOT, n: 'Bad', f: [], items: [['invalid\"id', 'X', 0]] }]) {
    const storage = new Map(), c = frontend(storage);
    const lastRead = root.n === 'Old' ? Date.now() - 11 * 60 * 60 * 1000 : Date.now();
    storage.set(c.driveCacheKey(), JSON.stringify({ version: 1, root, lastRead, savedAt: Date.now() }));
    assert.equal(c.restoreDriveCache(), false);
    assert.equal(vm.runInContext('driveRoot.totalImages', c), 0);
  }
});
