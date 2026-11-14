// Real browser + real face-api models. Set FACE_FIXTURE to an image with a clear face.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ROOT = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const URL = 'https://script.google.com/macros/s/memories-ui/exec';
const folders = new Map([
  [ROOT, { id: ROOT, n: '12A1', items: [], f: [{ id: 'person', n: '9. Dương Thanh Điền' }, { id: 'other', n: '1. Người nhà' }] }],
  ['person', { id: 'person', n: '9. Dương Thanh Điền', f: [{ id: 'nested', n: 'Album nhỏ' }], items: Array.from({ length: 29 }, (_, i) => [`photo${i}`, `Ảnh ${i}.jpg`, 0, '2026-11-14']) }],
  ['nested', { id: 'nested', n: 'Album nhỏ', f: [], items: [['nested-photo', 'Ảnh trong album.jpg', 0, '2026-11-14']] }],
  ['other', { id: 'other', n: '1. Người nhà', f: [], items: [] }],
]);
let profile = { revision: 0 }, thumbnailRequests = 0, thumbnailFailure = false, delayThumbnail = false, thumbnailStarted = false, blankImage = null;
const errors = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(url => localStorage.setItem('kn-drive-script-url', url), URL);
    const fixture = process.env.FACE_FIXTURE ? fs.readFileSync(process.env.FACE_FIXTURE) : null;
    await context.route('https://script.google.com/**', async route => {
      const req = route.request(), p = req.method() === 'POST' ? req.postDataJSON() : Object.fromEntries(new global.URL(req.url()).searchParams);
      let response;
      if (p.action === 'ping') response = { ok: true, rootId: ROOT, version: 2, writable: true, profiles: true, faceThumbnails: true };
      else if (p.action === 'folder') response = { ok: true, folder: folders.get(p.id) };
      else if (p.action === 'profile') response = { ok: true, profile };
      else if (p.action === 'saveProfile') { assert.equal(p.revision, profile.revision); profile = { ...p.profile, revision: profile.revision + 1 }; response = { ok: true, profile }; }
      else if (p.action === 'faceThumbnail') {
        thumbnailRequests++; thumbnailStarted = true;
        if (delayThumbnail) await new Promise(resolve => setTimeout(resolve, 3000));
        response = thumbnailFailure ? { ok: false, error: 'Thumbnail temporarily unavailable' }
          : { ok: true, image: blankImage || `data:image/jpeg;base64,${fixture.toString('base64')}` };
      }
      else throw new Error('Unexpected request: ' + p.action);
      await route.fulfill({ json: response, headers: { 'Access-Control-Allow-Origin': '*' } }).catch(error => { if (browser.isConnected() && !req.failure()) throw error; });
    });
    // Force the CORS-safe thumbnail path for analysis, while display images use a tiny placeholder.
    await context.route(/https:\/\/(lh3\.googleusercontent|drive\.google|ui-avatars\.com)/, route => route.abort());
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    const network = []; page.on('request', request => network.push(request.url()));
    await page.goto('http://localhost:8080', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !liveState.scanning && folderById.get('nested')?.loaded);
    assert.equal(network.some(url => url.includes('face-api.min.js')), false, 'face models must not affect initial load');
    await page.locator('[onclick="openStudentModal(\'person\')"]').click();
    assert.match(await page.locator('#member-profile').innerText(), /12A1/);
    assert.equal(await page.locator('#modal-name').innerText(), 'Dương Thanh Điền');
    assert.equal(await page.locator('#modal-gallery button').count(), 24);
    assert.equal(await page.evaluate(() => document.querySelector('#member-profile').getBoundingClientRect().top < document.querySelector('#modal-gallery').getBoundingClientRect().top), true);
    await page.locator('#profile-more').click();
    assert.equal(await page.locator('#modal-gallery button').count(), 30, 'nested memories are included');
    await page.locator('#profile-edit').click();
    await page.locator('[name=nickname]').fill('Điền <script>bad()</script>');
    await page.locator('[name=quote]').fill('Mai này vẫn có nhau.');
    await page.locator('#profile-form [type=submit]').click();
    await page.waitForFunction(() => memberState.profile.revision === 1);
    assert.equal(await page.locator('#member-profile script').count(), 0, 'profile values are escaped');
    await page.evaluate(() => closeModal());
    await page.evaluate(() => openStudentModal('other'));
    assert.match(await page.locator('#member-profile').innerText(), /12A1/);
    await page.evaluate(() => closeModal());
    if (fixture) {
      // Keep real inference bounded while still covering nested folders and cache invalidation.
      folders.get('person').items = folders.get('person').items.slice(0, 1);
      await page.evaluate(() => refreshDriveNow());
      await page.locator('#face-reference').setInputFiles({ name: 'reference.jpg', mimeType: 'image/jpeg', buffer: fixture });
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled, null, { timeout: 120000 });
      assert.ok(await page.locator('#face-candidates button').count() >= 1, 'real models detect faces');
      if (await page.locator('#face-candidates button').count() > 1) {
        await page.locator('#face-candidates button').nth(1).click();
        assert.equal(await page.locator('#face-candidates button[aria-pressed=true]').count(), 1);
      }
      const baselineTensors = await page.evaluate(() => faceapi.tf.memory().numTensors);
      const coldStart = Date.now();
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled, null, { timeout: 120000 });
      const coldMs = Date.now() - coldStart;
      assert.ok(await page.evaluate(() => faceapi.tf.memory().numTensors) <= baselineTensors + 8, 'inference tensors are disposed after indexing');
      assert.match(await page.locator('#face-status').innerText(), /Đã tìm: 2\/2/);
      assert.equal(await page.locator('#face-results button').count(), 2);
      const reads = thumbnailRequests;
      assert.equal(reads, 2);
      const warmStart = Date.now();
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled);
      assert.equal(thumbnailRequests, reads, 'second search uses descriptors, not thumbnails');
      assert.match(await page.locator('#face-status').innerText(), /2 dùng lại chỉ mục/);
      console.log(`Real-model sample (2 files): first index ${coldMs}ms, cached search ${Date.now() - warmStart}ms.`);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => liveState.faceThumbnails);
      await page.locator('#face-reference').setInputFiles({ name: 'reference.jpg', mimeType: 'image/jpeg', buffer: fixture });
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled, null, { timeout: 120000 });
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled);
      assert.equal(thumbnailRequests, reads, 'IndexedDB survives reload');
      folders.get('person').items[0][3] = '2026-11-15';
      await page.evaluate(() => refreshDriveNow());
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled, null, { timeout: 120000 });
      assert.equal(thumbnailRequests, reads + 1, 'modified file is reindexed');
      // A failed thumbnail is retried next time rather than cached as a no-face result.
      folders.get('person').items[0][3] = '2026-11-16';
      await page.evaluate(() => refreshDriveNow());
      thumbnailFailure = true;
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled);
      assert.match(await page.locator('#face-status').innerText(), /1 tệp chưa đọc được/);
      const failedReads = thumbnailRequests;
      thumbnailFailure = false;
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled);
      assert.equal(thumbnailRequests, failedReads + 1);
      // An image with no face is a successful, cacheable index entry with no match.
      blankImage = await page.evaluate(() => { const canvas = document.createElement('canvas'); canvas.width = canvas.height = 160; canvas.getContext('2d').fillRect(0, 0, 160, 160); return canvas.toDataURL('image/png'); });
      folders.get('person').items[0][3] = '2026-11-17';
      await page.evaluate(() => refreshDriveNow());
      await page.locator('#face-search-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled);
      assert.equal(await page.locator('#face-results button').count(), 1, 'blank images cannot produce face matches');
      blankImage = null;
      // Stopping aborts an in-flight thumbnail without waiting for the upstream timeout.
      folders.get('person').items[0][3] = '2026-11-18';
      await page.evaluate(() => refreshDriveNow());
      delayThumbnail = true; thumbnailStarted = false;
      await page.locator('#face-search-button').click();
      const thumbnailDeadline = Date.now() + 10000;
      while (!thumbnailStarted && Date.now() < thumbnailDeadline) await new Promise(resolve => setTimeout(resolve, 20));
      assert.equal(thumbnailStarted, true, 'thumbnail request starts before cancellation');
      await page.locator('#face-stop-button').click();
      await page.waitForFunction(() => !document.querySelector('#face-search-button').disabled, null, { timeout: 2500 });
      assert.match(await page.locator('#face-status').innerText(), /Đã dừng/);
      delayThumbnail = false;
      await page.locator('#face-clear-button').click();
      await page.waitForFunction(() => document.querySelector('#face-status').textContent.includes('Đã xóa'));
      assert.equal(await page.locator('#face-search-button').isDisabled(), true);
    } else console.log('Real recognition checks skipped: set FACE_FIXTURE to enable.');
    fs.mkdirSync(path.join(__dirname, '..', 'test-results'), { recursive: true });
    await page.locator('#section-face-search').screenshot({ path: path.join(__dirname, '..', 'test-results', 'memories-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#section-face-search').screenshot({ path: path.join(__dirname, '..', 'test-results', 'memories-mobile.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => openStudentModal('person'));
    await page.waitForTimeout(400);
    await page.locator('#student-modal').screenshot({ path: path.join(__dirname, '..', 'test-results', 'profile-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('Memories checks passed: profile, nested/paged archive, shared save, escaped fields, lazy models, real recognition/cache when enabled, mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
