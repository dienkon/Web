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

test('shared member profiles validate fields, root boundaries and concurrent revisions', () => {
  const g = gas();
  assert.equal(g.get({ action: 'profile', id: 'child' }).profile.revision, 0);
  const body = { action: 'saveProfile', id: 'child', revision: 0,
    profile: { nickname: '  Điền  ', birthday: '20/11', role: 'Thành viên 12A1', hobbies: 'Chụp ảnh', quote: '<b>Nhà có nhau</b>', injected: 'ignored' } };
  const saved = g.post(body);
  assert.equal(saved.ok, true); assert.equal(saved.profile.nickname, 'Điền');
  assert.equal(saved.profile.injected, undefined);
  assert.equal(saved.profile.revision, 1);
  assert.equal(g.get({ action: 'profile', id: 'child' }).profile.quote, '<b>Nhà có nhau</b>');
  assert.match(g.post(body).error, /vừa được cập nhật/);
  assert.equal(g.post({ ...body, revision: 1, profile: { nickname: 'x'.repeat(61) } }).ok, false);
  assert.equal(g.post({ ...body, revision: 1, profile: { nickname: ['wrong type'] } }).ok, false);
  for (const id of ['outside', 'trash', 'deep', 'unknown']) {
    assert.equal(g.get({ action: 'profile', id }).ok, false);
    assert.equal(g.post({ ...body, id }).ok, false);
  }
  assert.equal(g.requests.length, 0, 'profile editing does not mutate Drive files or upload sessions');
});

test('face thumbnail fallback rejects files outside the root, trash and untrusted image hosts', () => {
  const g = gas();
  for (const file of [
    { parents: ['outside'], thumbnailLink: 'https://lh3.googleusercontent.com/d/image=s220' },
    { parents: ['child'], trashed: true, thumbnailLink: 'https://lh3.googleusercontent.com/d/image=s220' },
    { parents: ['child'], thumbnailLink: 'https://example.com/steal-token' },
    { parents: ['child'], thumbnailLink: 'https://googleusercontent.com.evil.com/image' },
  ]) {
    g.requests.length = 0; g.context.fetchResponse = () => g.res(200, file);
    assert.equal(g.get({ action: 'faceThumbnail', id: 'photo' }).ok, false);
    assert.equal(g.requests.length, 1, 'never fetch bytes before validating file ancestry and image host');
  }
  assert.equal(g.get({ action: 'faceThumbnail', id: "bad'id" }).ok, false);
});

test('face thumbnail fallback returns only bounded image bytes from permitted files', () => {
  const g = gas();
  g.context.Utilities.base64Encode = data => Buffer.from(data).toString('base64');
  g.context.fetchResponse = url => url.startsWith('https://lh3.')
    ? { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => [1, 2, 3], getContentType: () => 'image/jpeg' }) }
    : g.res(200, { parents: ['child'], thumbnailLink: 'https://lh3.googleusercontent.com/d/photo=s220' });
  const result = g.get({ action: 'faceThumbnail', id: 'photo' });
  assert.equal(result.ok, true); assert.equal(result.image, 'data:image/jpeg;base64,AQID');
  assert.match(g.requests[1].url, /=s960$/);
  assert.doesNotMatch(JSON.stringify(result), /server-only-token|thumbnailLink/);
  g.context.fetchResponse = url => url.startsWith('https://lh3.')
    ? { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => Buffer.alloc(3 * 1024 * 1024 + 1), getContentType: () => 'image/jpeg' }) }
    : g.res(200, { parents: ['child'], thumbnailLink: 'https://lh3.googleusercontent.com/d/photo=s220' });
  assert.match(g.get({ action: 'faceThumbnail', id: 'photo' }).error, /quá lớn/);
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
  context.Blob = Blob; context.File = File; context.atob = atob; context.btoa = btoa;
  for (const script of scripts) vm.runInContext(script, context);
  vm.runInContext(fs.readFileSync(path.join(base, 'drive-images.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(base, 'drive-live.js'), 'utf8'), context);
  vm.runInContext('repaintLiveData = () => {}; setDriveStatus = () => {};', context);
  return context;
}

test('static hosting reports a missing bridge without requesting a local API', async () => {
  const c = frontend();
  for (const action of ['ping', 'folder', 'history']) await assert.rejects(c.driveRequest(action), /appsScriptUrl/);
  await assert.rejects(c.driveRequest('uploadStart', {}, true), /appsScriptUrl/);
});

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

function buildMockJpeg(width, height, payloadSize = 64) {
  const sof = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, (height >> 8) & 0xff, height & 0xff, (width >> 8) & 0xff, width & 0xff, 0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
  ]);
  const body = Buffer.alloc(payloadSize, 0x55);
  return Buffer.concat([sof, body, Buffer.from([0xff, 0xd9])]);
}

function buildMockNef({ thumbJpeg, fullJpeg, orientation = 6 }) {
  // Layout: [0..7] TIFF LE header -> IFD0 at 8 (4 entries: Orientation, JPEGInterchangeFormat, JPEGInterchangeFormatLength, SubIFDs type=13)
  // SubIFD0 at 68 (2 entries: JPEGInterchangeFormat, JPEGInterchangeFormatLength) -> thumbJpeg -> fullJpeg + zero padding
  const ifd0Offset = 8;
  const subIfdOffset = 8 + 2 + 4 * 12 + 4; // 62 -> align 64
  const subPos = 64;
  const thumbPos = subPos + 2 + 2 * 12 + 4; // 94 -> align 96
  const thumbStart = 96;
  const fullStart = thumbStart + thumbJpeg.length;
  const total = fullStart + fullJpeg.length + 12;
  const buf = Buffer.alloc(total, 0);
  buf.write('II', 0, 'ascii');
  buf.writeUInt16LE(42, 2);
  buf.writeUInt32LE(ifd0Offset, 4);

  const writeEntry = (pos, tag, type, count, value) => {
    buf.writeUInt16LE(tag, pos);
    buf.writeUInt16LE(type, pos + 2);
    buf.writeUInt32LE(count, pos + 4);
    if (type === 3 && count === 1) buf.writeUInt16LE(value, pos + 8);
    else buf.writeUInt32LE(value, pos + 8);
  };

  buf.writeUInt16LE(4, ifd0Offset);
  writeEntry(ifd0Offset + 2, 0x0112, 3, 1, orientation);
  writeEntry(ifd0Offset + 14, 0x0201, 4, 1, thumbStart);
  writeEntry(ifd0Offset + 26, 0x0202, 4, 1, thumbJpeg.length);
  writeEntry(ifd0Offset + 38, 0x014a, 13, 1, subPos); // TIFF type 13 (IFD)
  buf.writeUInt32LE(0, ifd0Offset + 50);

  buf.writeUInt16LE(2, subPos);
  writeEntry(subPos + 2, 0x0201, 4, 1, fullStart);
  writeEntry(subPos + 14, 0x0202, 4, 1, fullJpeg.length + 8); // padded length
  buf.writeUInt32LE(0, subPos + 26);

  thumbJpeg.copy(buf, thumbStart);
  fullJpeg.copy(buf, fullStart);
  return buf;
}

test('NEF converter extracts full-resolution SubIFD JPEG, preserves portrait EXIF orientation and renames to .jpg', async () => {
  const c = frontend();
  const thumb = buildMockJpeg(160, 120, 32);
  const full = buildMockJpeg(6048, 4032, 512);
  const nefBytes = buildMockNef({ thumbJpeg: thumb, fullJpeg: full, orientation: 6 });

  const result = await c.convertNefToJpeg(nefBytes, { fileName: 'DSC_7916.NEF' });
  assert.equal(result.converted, true);
  assert.equal(result.fileName, 'DSC_7916.jpg');
  assert.equal(result.source, 'nef-binary');
  assert.equal(result.orientation, 6);
  assert.equal(result.width, 4032);
  assert.equal(result.height, 6048);
  assert.equal(result.blob.type, 'image/jpeg');

  const outBytes = new Uint8Array(await result.blob.arrayBuffer());
  assert.equal(outBytes[0], 0xff); assert.equal(outBytes[1], 0xd8);
  assert.equal(outBytes[outBytes.length - 2], 0xff); assert.equal(outBytes[outBytes.length - 1], 0xd9);
  const meta = c.parseJpegMetadata(outBytes);
  assert.equal(meta.width, 6048);
  assert.equal(meta.height, 4032);
  assert.equal(meta.exifOrientation, 6, 'lossless EXIF APP1 orientation is injected for portrait NEF');
});

test('Drive bridge classifies NEF as image and serves full-resolution download fallback securely', async () => {
  const g = gas();
  g.context.Utilities.base64Encode = data => Buffer.from(data).toString('base64');
  g.context.fetchResponse = () => g.res(200, { files: [{ id: 'nef1', name: 'DSC_7916.NEF', mimeType: 'application/octet-stream', modifiedTime: '2026-11-24' }] });
  const listing = g.get({ action: 'folder', id: 'child' });
  assert.equal(listing.folder.items[0][2], 0, 'NEF with generic MIME is still classified as an image');

  for (const bad of [
    { parents: ['outside'], thumbnailLink: 'https://lh3.googleusercontent.com/d/nef1=s220' },
    { parents: ['child'], trashed: true, thumbnailLink: 'https://lh3.googleusercontent.com/d/nef1=s220' },
    { parents: ['child'], thumbnailLink: 'https://evil.example/nef1=s220' },
  ]) {
    g.requests.length = 0; g.context.fetchResponse = () => g.res(200, bad);
    assert.equal(g.get({ action: 'downloadImage', id: 'nef1' }).ok, false);
    assert.equal(g.requests.length, 1);
  }

  const fullJpeg = buildMockJpeg(6048, 4032, 128);
  g.requests.length = 0;
  g.context.fetchResponse = url => url.startsWith('https://lh3.')
    ? { getResponseCode: () => 200, getBlob: () => ({ getBytes: () => fullJpeg, getContentType: () => 'image/jpeg' }) }
    : g.res(200, { id: 'nef1', name: 'DSC_7916.NEF', parents: ['child'], thumbnailLink: 'https://lh3.googleusercontent.com/d/nef1=s220' });
  const dl = g.get({ action: 'downloadImage', id: 'nef1' });
  assert.equal(dl.ok, true);
  assert.match(g.requests[1].url, /=s0$/, 'downloadImage requests full original resolution =s0');
  assert.match(dl.image, /^data:image\/jpeg;base64,/);

  const c = frontend();
  c.fetch = async url => {
    assert.match(String(url), /=s0$/);
    return { ok: true, arrayBuffer: async () => fullJpeg.buffer.slice(fullJpeg.byteOffset, fullJpeg.byteOffset + fullJpeg.byteLength) };
  };
  const fetched = await c.fetchDriveOriginalImage('nef1', 'DSC_7916.NEF');
  assert.equal(fetched.fileName, 'DSC_7916.jpg');
  assert.equal(fetched.blob.type, 'image/jpeg');
  assert.equal(fetched.file instanceof File, true);
  assert.equal(fetched.file.type, 'image/jpeg');
  assert.equal(fetched.converted, true);
});

test('cross-platform download verifies FF D8 FF magic bytes, normalizes HEIC/HEIF/PNG names to .jpg, preserves JPEG bytes and handles iOS/iPadOS/Zalo', async () => {
  const c = frontend();
  assert.equal(c.normalizeJpegFileName('IMG_8812.HEIC'), 'IMG_8812.jpg');
  assert.equal(c.normalizeJpegFileName('IMG_8812.HEIF'), 'IMG_8812.jpg');
  assert.equal(c.normalizeJpegFileName('Screenshot_2026.PNG'), 'Screenshot_2026.jpg');
  assert.equal(c.normalizeJpegFileName('A1_photo.HEIC.PNG'), 'A1_photo.jpg');
  assert.equal(c.normalizeJpegFileName('ky-niem.JPEG'), 'ky-niem.jpg');

  // Fake Content-Type image/jpeg with HTML body must be rejected; fallback endpoint with real FF D8 FF succeeds without re-encoding.
  const genuineJpeg = buildMockJpeg(4032, 3024, 256);
  let calls = 0;
  c.fetch = async () => {
    calls++;
    if (calls === 1) {
      const htmlBytes = Buffer.from('<!DOCTYPE html><html>Error</html>', 'utf8');
      return {
        ok: true,
        status: 200,
        headers: { get: k => (k === 'content-type' ? 'image/jpeg' : '') },
        arrayBuffer: async () => htmlBytes.buffer.slice(htmlBytes.byteOffset, htmlBytes.byteOffset + htmlBytes.byteLength),
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: k => (k === 'content-type' ? 'image/jpeg' : '') },
      arrayBuffer: async () => genuineJpeg.buffer.slice(genuineJpeg.byteOffset, genuineJpeg.byteOffset + genuineJpeg.byteLength),
    };
  };

  const heicRes = await c.fetchDriveOriginalImage('heic1', 'IMG_9999.HEIC');
  assert.equal(calls, 2, 'rejects non-JPEG binary even when HTTP Content-Type claims image/jpeg');
  assert.equal(heicRes.fileName, 'IMG_9999.jpg');
  assert.equal(heicRes.file instanceof File, true);
  assert.equal(heicRes.file.type, 'image/jpeg');
  assert.equal(heicRes.losslessPassthrough, true, 'does not re-compress valid JPEG stream');
  const savedBytes = Buffer.from(await heicRes.file.arrayBuffer());
  assert.equal(Buffer.compare(savedBytes, genuineJpeg), 0, 'preserves 100% exact JPEG bytes');

  // Platform & iOS/iPadOS/In-App detection + synchronous cached Web Share API ({ files }).
  c.navigator.userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.4 Safari/605.1.15';
  c.navigator.platform = 'MacIntel';
  c.navigator.maxTouchPoints = 5;
  assert.equal(c.getDownloadPlatformInfo().isIOS, true, 'detects iPadOS desktop-mode Safari');
  assert.equal(c.getDownloadPlatformInfo().os, 'iPadOS');

  c.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Zalo/24.09';
  c.navigator.platform = 'iPhone';
  c.navigator.maxTouchPoints = 5;
  assert.equal(c.getDownloadPlatformInfo().isIOS, true);
  assert.equal(c.getDownloadPlatformInfo().isInApp, true);
  assert.equal(c.getDownloadPlatformInfo().inAppName, 'Zalo');

  // Pre-prepared File on iPhone Safari triggers navigator.share({ files }) synchronously without awaiting network.
  c.navigator.userAgent = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1';
  let sharedPayload = null;
  c.navigator.canShare = data => Array.isArray(data?.files) && data.files.length > 0 && data.files[0].type === 'image/jpeg';
  c.navigator.share = async data => { sharedPayload = data; };
  const handledSync = c.tryImmediateCachedIOSShare(['heic1', 'IMG_9999.HEIC', 0]);
  await Promise.resolve();
  assert.equal(handledSync, true);
  assert.equal(sharedPayload.files.length, 1);
  assert.equal(sharedPayload.files[0].name, 'IMG_9999.jpg');
  assert.equal(sharedPayload.files[0].type, 'image/jpeg');
  assert.equal('title' in sharedPayload, false, 'passes only { files } so iOS Share Sheet displays Save Image to Photos');
});
