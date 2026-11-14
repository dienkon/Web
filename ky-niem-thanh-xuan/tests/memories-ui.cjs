// Static browser verification for shared profiles and member archives.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BASE = process.env.PREVIEW_URL || 'https://pages.test/Web/ky-niem-thanh-xuan/';
const ROOT = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const URL = 'https://script.google.com/macros/s/memories-ui/exec';
const folders = new Map([
  [ROOT, { id: ROOT, n: '12A1', items: [], f: [{ id: 'person', n: '9. Dương Thanh Điền' }, { id: 'other', n: '1. Người nhà' }] }],
  ['person', { id: 'person', n: '9. Dương Thanh Điền', f: [{ id: 'nested', n: 'Album nhỏ' }], items: Array.from({ length: 29 }, (_, i) => [`photo${i}`, `Ảnh ${i}.jpg`, 0, '2026-11-14']) }],
  ['nested', { id: 'nested', n: 'Album nhỏ', f: [], items: [['nested-photo', 'Ảnh trong album.jpg', 0, '2026-11-14']] }],
  ['other', { id: 'other', n: '1. Người nhà', f: [], items: [] }],
]);
let profile = { revision: 0 };
const errors = [];
(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    if (!process.env.PREVIEW_URL) await require('./static-host.cjs')(context, BASE);
    await context.addInitScript(({ url, origin }) => { if (location.origin === origin) localStorage.setItem('kn-drive-script-url', url); }, { url: URL, origin: new global.URL(BASE).origin });
    await context.route('https://script.google.com/**', async route => {
      const req = route.request(), p = req.method() === 'POST' ? req.postDataJSON() : Object.fromEntries(new global.URL(req.url()).searchParams);
      let response;
      if (p.action === 'ping') response = { ok: true, rootId: ROOT, version: 2, writable: true, profiles: true, faceThumbnails: true };
      else if (p.action === 'folder') response = { ok: true, folder: folders.get(p.id) };
      else if (p.action === 'profile') response = { ok: true, profile };
      else if (p.action === 'saveProfile') { assert.equal(p.revision, profile.revision); profile = { ...p.profile, revision: profile.revision + 1 }; response = { ok: true, profile }; }
      else throw new Error('Unexpected request: ' + p.action);
      await route.fulfill({ json: response, headers: { 'Access-Control-Allow-Origin': '*' } }).catch(error => { if (browser.isConnected() && !req.failure()) throw error; });
    });
    // Provide lightweight display thumbnails without calling external storage.
    await context.route(/https:\/\/(lh3\.googleusercontent|drive\.google|ui-avatars\.com)/, route => {
      if (route.request().resourceType() === 'image' && !route.request().headers().origin) return route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#e0e7ff"/></svg>' });
      return route.abort();
    });
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    const network = []; page.on('request', request => network.push(request.url()));
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => !liveState.scanning && folderById.get('nested')?.loaded);
    assert.equal(network.some(url => /face-search|assets\/face|cdn.tailwindcss/.test(url)), false, 'removed models and runtime CSS are never requested');
    assert.equal(network.some(url => new global.URL(url).pathname.includes('/api/')), false, 'static pages never call local API endpoints');
    assert.equal(await page.locator('#section-face-search').count(), 0);
    assert.equal(await page.locator('#class-map-grid').evaluate(el => getComputedStyle(el).display), 'grid', 'compiled local CSS is applied');
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
    fs.mkdirSync(path.join(__dirname, '..', 'test-results'), { recursive: true });
    await page.locator('#section-class-map').screenshot({ path: path.join(__dirname, '..', 'test-results', 'memories-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#section-class-map').screenshot({ path: path.join(__dirname, '..', 'test-results', 'memories-mobile.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.evaluate(() => openStudentModal('person'));
    await page.waitForTimeout(400);
    await page.locator('#student-modal').screenshot({ path: path.join(__dirname, '..', 'test-results', 'profile-mobile.png') });
    assert.deepEqual(errors, []);
    console.log('Memories checks passed: static CSS, profile, nested/paged archive, shared save, escaped fields, mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
