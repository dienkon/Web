// Exercise display recovery with blocked Google image hosts and a working Apps Script bridge.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const BASE = process.env.PREVIEW_URL || 'http://localhost:8091';
const ROOT = '1MmsTXHQZ4QoSsbi5XixRHzwE8lrGBVxa';
const config = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'drive-config.js'), 'utf8'), config);
const LIVE_ID = process.env.LIVE_DRIVE_THUMBNAIL_ID;
const URL = LIVE_ID ? config.window.DRIVE_CONFIG.appsScriptUrl : 'https://script.google.com/macros/s/image-recovery-test/exec';
const root = { id: ROOT, n: 'Kho ảnh kiểm thử', f: [], loaded: true, items: LIVE_ID ? [[LIVE_ID, 'Ảnh Drive thật.jpg', 0, '']] : Array.from({ length: 12 }, (_, i) => [`image${i}`, `Ảnh ${i}.jpg`, 0, '2026-11-14']) };

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 1000 } });
    await context.addInitScript(({ root, url, ROOT, origin }) => {
      if (location.origin !== origin) return;
      localStorage.setItem('kn-drive-script-url', url);
      const now = Date.now(); root.loadedAt = now;
      localStorage.setItem('kn-drive-cache-v1:' + JSON.stringify([ROOT, url]), JSON.stringify({ version: 1, lastRead: now, lastScan: now, lastPoll: now, root }));
    }, { root, url: URL, ROOT, origin: new global.URL(BASE).origin });
    const page = await context.newPage(), errors = [], calls = new Map();
    page.on('pageerror', error => errors.push(error.message));
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 48; c.height = 36; c.getContext('2d').fillRect(0, 0, 48, 36); return c.toDataURL('image/png'); });
    let active = 0, maximum = 0, pingComplete = false, earlyBridge = false, failRetry = true;
    await context.route(/https:\/\/(lh3\.googleusercontent\.com|drive\.google\.com)\//, route => route.abort());
    await context.route('https://script.google.com/**', async route => {
      const p = Object.fromEntries(new global.URL(route.request().url()).searchParams);
      if (p.action === 'ping') {
        await new Promise(resolve => setTimeout(resolve, 300)); pingComplete = true;
        return route.fulfill({ json: { ok: true, version: 2, rootId: ROOT, writable: true, faceThumbnails: true } });
      }
      if (p.action === 'folder') return route.fulfill({ json: { ok: true, folder: root } });
      assert.equal(p.action, 'faceThumbnail');
      calls.set(p.id, (calls.get(p.id) || 0) + 1); earlyBridge ||= !pingComplete;
      if (LIVE_ID) return route.continue();
      active++; maximum = Math.max(maximum, active);
      await new Promise(resolve => setTimeout(resolve, p.id === 'stale-image' ? 400 : 100));
      active--;
      return route.fulfill({ json: p.id.startsWith('unavailable') || p.id === 'retry-image' && failRetry
        ? { ok: false, error: 'Temporarily unavailable' }
        : { ok: true, image: p.id === 'corrupt-image' ? 'data:image/jpeg;base64,AA==' : png } });
    });
    await page.goto(BASE, { waitUntil: 'domcontentloaded' });
    await page.locator('#drive-files-grid').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('#drive-files-grid img')].every(img => img.complete && img.naturalWidth > 0 && img.dataset.driveImageSource === 'bridge'), null, { timeout: 60000 });
    assert.equal(earlyBridge, false, 'cached galleries wait for the initial bridge handshake');
    assert.equal(calls.size, root.items.length);
    if (!LIVE_ID) {
      assert.ok(maximum > 1 && maximum <= 3, 'recovery has bounded parallelism');
      assert.equal(await page.evaluate(async () => { await getDriveThumbnailData('image0'); return true; }), true);
      assert.equal(calls.get('image0'), 1, 'decoded thumbnails are cached');
      await page.evaluate(() => {
        for (let i = 0; i < 3; i++) { const image = new Image(); image.className = 'deduplicated'; image.onerror = () => recoverDriveImage(image); document.body.append(image); image.src = getDriveThumbUrl('shared-image'); }
      });
      await page.waitForFunction(() => [...document.querySelectorAll('.deduplicated')].every(img => img.dataset.driveImageSource === 'bridge' && img.naturalWidth > 0));
      assert.equal(calls.get('shared-image'), 1, 'multiple views of one photo share one bridge request');
      assert.equal(await page.evaluate(async () => { try { await getDriveThumbnailData('retry-image'); return false; } catch (_) { return true; } }), true);
      failRetry = false;
      await page.evaluate(() => getDriveThumbnailData('retry-image'));
      assert.equal(calls.get('retry-image'), 2, 'failed requests are not cached');
      await page.evaluate(() => {
        for (const id of ['unavailable', 'corrupt-image', 'stale-image']) { const image = new Image(); image.id = id; image.onerror = () => recoverDriveImage(image); document.body.append(image); image.src = getDriveThumbUrl(id); }
      });
      await page.waitForFunction(() => document.querySelector('#stale-image').src === driveImageLoading);
      await page.evaluate(png => { document.querySelector('#stale-image').src = png; }, png);
      await page.waitForFunction(() => ['unavailable', 'corrupt-image'].every(id => { const img = document.getElementById(id); return img.dataset.driveImageFailed === 'true' && img.complete && img.naturalWidth > 0; }));
      await page.waitForFunction(() => driveImageStore.active === 0 && driveImageStore.pending.size === 0);
      assert.equal(await page.locator('#stale-image').getAttribute('data-drive-image-source'), null, 'late recovery cannot overwrite a newer image source');
      assert.equal(calls.get('unavailable'), 1); assert.equal(calls.get('corrupt-image'), 1, 'invalid bytes cannot create an error loop');
      await page.evaluate(() => { document.getElementById('unavailable').src = getDriveThumbUrl('unavailable-second'); });
      await page.waitForFunction(() => document.getElementById('unavailable').src === driveImagePlaceholder);
      assert.equal(calls.get('unavailable-second'), 1, 'a reused image element gets a fresh recovery attempt');
      for (const id of ['unavailable', 'unavailable-second']) {
        await page.evaluate(id => { lightboxList = [[id, 'Ảnh cần mở bằng Drive.jpg', 0, '']]; openLightboxAt(0); }, id);
        await page.waitForFunction(() => forceDriveIframeForImage && !document.getElementById('lightbox-iframe-wrap').classList.contains('hidden'));
        await page.evaluate(() => closeLightbox());
      }
    } else {
      assert.equal(calls.get(LIVE_ID), 1, 'live display uses the deployed bridge successfully');
      assert.ok(await page.locator('#drive-files-grid img').evaluate(img => img.naturalWidth) > 100);
    }
    for (const endpoint of ['/favicon.svg', '/favicon.ico']) {
      const response = await page.request.get(BASE + endpoint); assert.equal(response.status(), 200); assert.match(response.headers()['content-type'], /image\/svg\+xml/);
    }
    assert.equal((await page.request.get(BASE + '/.well-known/appspecific/com.chrome.devtools.json')).status(), 204);
    assert.deepEqual(errors, []);
    console.log(`Image recovery passed (${LIVE_ID ? 'deployed bridge and real Drive image' : 'mock bridge'}): blocked direct hosts, startup handshake, decoded images${LIVE_ID ? '' : ', cache/deduplication, concurrency, failed/corrupt bytes, stale requests'}, favicon and DevTools routes.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
