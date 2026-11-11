// Optional browser verification: install playwright, then node tests/drive-ui.cjs.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const ROOT = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const URL = 'https://script.google.com/macros/s/test-live-drive/exec';
const folders = new Map([
  [ROOT, { id: ROOT, n: 'Kho Drive thử nghiệm', f: [{ id: 'photos', n: 'Ảnh mới' }, { id: 'empty', n: 'Thư mục trống' }], items: [['doc', '<b>Tài liệu.zip</b>', 2, '2026-11-11']] }],
  ['photos', { id: 'photos', n: 'Ảnh mới', f: [], items: [['photo1', 'Ảnh 1.jpg', 0, '2026-11-11'], ['video1', 'Video.mov', 1, '2026-11-11']] }],
  ['empty', { id: 'empty', n: 'Thư mục trống', f: [], items: [] }],
]);
const events = [], uploads = new Map(), errors = [];
let lostAck = true;
let delayPing = false;
const folderReads = new Map();

async function routeDrive(route) {
  const request = route.request(), url = new global.URL(request.url());
  const body = request.method() === 'POST' ? request.postDataJSON() : Object.fromEntries(url.searchParams);
  let response = { ok: true };
  if (body.action === 'ping') {
    if (delayPing) await new Promise(resolve => setTimeout(resolve, 1000));
    response = { ok: true, rootId: ROOT, version: 2, writable: true };
  }
  else if (body.action === 'folder') {
    folderReads.set(body.id, (folderReads.get(body.id) || 0) + 1);
    const folder = structuredClone(folders.get(body.id));
    if (!folder) response = { ok: false, error: 'Folder removed' };
    else {
      // Exercise full pagination before replacing an existing listing.
      const items = folder.items;
      folder.items = body.pageToken ? items.slice(1) : items.slice(0, 1);
      response = { ok: true, folder, nextPageToken: !body.pageToken && items.length > 1 ? 'page2' : null };
      if (body.pageToken) folder.f = [];
    }
  } else if (body.action === 'history') response = { ok: true, events: events.toReversed(), nextBefore: null };
  else if (body.action === 'createFolder') {
    const folder = { id: `created${folders.size}`, n: body.folderName, f: [], items: [] };
    folders.set(folder.id, folder); folders.get(body.parentId).f.push({ id: folder.id, n: folder.n });
    events.push({ id: body.operationId, action: 'createFolder', name: folder.n, status: 'success', folderId: body.parentId, folderName: folders.get(body.parentId).n, createdAt: new Date().toISOString(), fileId: folder.id });
    response = { ok: true, folder };
  } else if (body.action === 'uploadStart') {
    if (!uploads.has(body.operationId)) {
      const upload = { ...body, offset: 0, buffers: [] };
      upload.event = { id: body.operationId, action: 'upload', name: body.fileName, size: body.size, folderName: folders.get(body.folderId).n, status: 'uploading', createdAt: new Date().toISOString() };
      events.push(upload.event); uploads.set(body.operationId, upload);
      if (body.size === 0) finish(upload);
    }
    const upload = uploads.get(body.operationId);
    response = { ok: true, offset: upload.offset, done: Boolean(upload.done), chunkBytes: 262144 };
  } else if (body.action === 'uploadChunk') {
    const upload = uploads.get(body.operationId), buffer = Buffer.from(body.base64Data, 'base64');
    assert.equal(body.offset, upload.offset, 'never send an already accepted chunk');
    upload.buffers.push(buffer); upload.offset += buffer.length;
    if (upload.offset === upload.size) finish(upload);
    if (lostAck) { lostAck = false; return route.abort('failed'); }
    response = { ok: true, offset: upload.offset, done: Boolean(upload.done) };
  } else if (body.action === 'uploadStatus') {
    const upload = uploads.get(body.operationId);
    response = { ok: true, offset: upload.offset, done: Boolean(upload.done) };
  } else if (body.action === 'uploadFailed') uploads.get(body.operationId).event.status = 'interrupted';
  else throw new Error('Unexpected action ' + body.action);
  return route.fulfill({ json: response, headers: { 'Access-Control-Allow-Origin': '*' } });
}
function finish(upload) {
  upload.done = true; upload.event.status = 'success';
  const id = `file${uploads.size}`;
  upload.event.fileId = id;
  folders.get(upload.folderId).items.push([id, upload.fileName, upload.mimeType.startsWith('image/') ? 0 : 2, new Date().toISOString()]);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addInitScript(url => {
      if (location.origin === 'http://localhost:8080') localStorage.setItem('kn-drive-script-url', url);
    }, URL);
    await context.route('https://script.google.com/**', routeDrive);
    await context.route(/https:\/\/(lh3\.googleusercontent|drive\.google|ui-avatars\.com)/, route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const dataRequests = [];
    page.on('request', request => { if (request.url().includes('drive-data.js')) dataRequests.push(request.url()); });
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => folderById.get('photos')?.loaded);
    assert.equal(await page.locator('#drive-upload-button').isEnabled(), true);
    assert.equal(await page.evaluate(() => driveRoot.totalImages), 1);
    assert.equal(await page.evaluate(() => driveRoot.totalVideos), 1);
    assert.equal(dataRequests.length, 0);
    assert.equal(await page.locator('#drive-files-grid b').count(), 0, 'Drive names are escaped');
    const readsBeforeOpen = folderReads.get('photos');
    await page.evaluate(() => openFolderInExplorer('photos'));
    await page.waitForFunction(() => activeMediaList.length === 2);
    assert.equal(folderReads.get('photos'), readsBeforeOpen, 'cached folder opens without waiting for Drive');
    const stableImage = await page.evaluate(() => {
      const image = document.querySelector('#drive-files-grid img');
      repaintLiveData();
      return image === document.querySelector('#drive-files-grid img');
    });
    assert.equal(stableImage, true, 'background renders preserve decoded thumbnails');
    await page.evaluate(() => { window.testLoadedThumbnail = document.querySelector('#drive-files-grid img'); });
    folders.get('photos').items.push(['extra', 'Ảnh thêm.jpg', 0, '2026-11-11']);
    await page.evaluate(() => refreshLiveFolder('photos'));
    assert.equal(await page.evaluate(() => window.testLoadedThumbnail === document.querySelector('#drive-files-grid img')), true, 'new Drive items do not reload existing images');
    await page.evaluate(() => openLightboxFromExplorer(0));
    assert.match(await page.locator('#lightbox-img').getAttribute('src'), /w600|sz=w600/, 'preview appears while original loads');
    await page.evaluate(() => closeLightbox());
    const videoPreview = await page.evaluate(() => {
      openLightboxFromExplorer(1);
      const poster = document.getElementById('lightbox-video-poster');
      return { visible: !poster.hidden, src: poster.src };
    });
    assert.equal(videoPreview.visible, true, 'video poster is visible before the Drive player loads');
    assert.match(videoPreview.src, /video1=w600/);
    await page.evaluate(() => closeLightbox());
    const payload = Buffer.alloc(600000, 37);
    await page.locator('#drive-upload-input').setInputFiles([
      { name: 'archive.bin', mimeType: 'application/octet-stream', buffer: payload },
      { name: 'empty.txt', mimeType: 'text/plain', buffer: Buffer.alloc(0) },
    ]);
    await page.evaluate(() => openFolderInExplorer('empty'));
    await page.waitForFunction(() => liveState.queue.length === 2 && liveState.queue.every(item => item.status === 'success'), { timeout: 15000 });
    const uploaded = [...uploads.values()].find(item => item.fileName === 'archive.bin');
    assert.equal(uploaded.folderId, 'photos', 'queue keeps original destination');
    assert.deepEqual(Buffer.concat(uploaded.buffers), payload);
    await page.evaluate(() => openCreateFolderDialog());
    await page.locator('#drive-folder-name').fill('Album mới <2026>');
    await page.locator('#drive-folder-submit').click();
    await page.waitForFunction(() => folderById.get('empty').f.length === 1);
    await page.locator('#tab-history').click();
    await page.waitForFunction(() => document.querySelector('#drive-history-list').children.length === 3);
    assert.match(await page.locator('#drive-history-list').innerText(), /archive\.bin/);
    await page.waitForFunction(() => !liveState.scanning);
    await page.evaluate(() => saveDriveCache());
    delayPing = true;
    const other = await context.newPage();
    await other.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    assert.equal(await other.evaluate(() => folderById.get('photos')?.loaded), true, 'reload restores real Drive data before slow connection checks');
    await other.locator('#tab-history').click();
    await other.waitForFunction(() => document.querySelector('#drive-history-list').children.length === 3);
    delayPing = false;
    folders.get(ROOT).f = folders.get(ROOT).f.filter(item => item.id !== 'photos');
    folders.get('empty').n = 'Đã đổi tên';
    folders.get(ROOT).f.find(item => item.id === 'empty').n = 'Đã đổi tên';
    await page.evaluate(() => refreshDriveNow());
    assert.equal(await page.evaluate(() => folderById.has('photos')), false, 'deleted tree is pruned');
    assert.equal(await page.evaluate(() => driveRoot.totalImages), 0, 'counts reflect deletions');
    assert.equal(await page.evaluate(() => folderById.get('empty').n), 'Đã đổi tên');
    await page.locator('#tab-drive').click();
    mkdirSync(path.join(__dirname, '..', 'test-results'), { recursive: true });
    await page.locator('#section-drive-explorer').screenshot({ path: path.join(__dirname, '..', 'test-results', 'drive-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#section-drive-explorer').screenshot({ path: path.join(__dirname, '..', 'test-results', 'drive-mobile.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'mobile does not overflow');
    assert.deepEqual(errors, []);
    console.log('Browser checks passed: live pagination, safe names, chunk retry, zero-byte file, destination, folders, shared history, deletion, rename, mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
