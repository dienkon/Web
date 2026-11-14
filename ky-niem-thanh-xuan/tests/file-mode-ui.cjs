const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext();
    await context.route(/^https?:/, route => route.abort());
    const page = await context.newPage(), models = [], errors = [];
    page.on('request', request => { if (request.url().includes('/assets/face/')) models.push(request.url()); });
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href, { waitUntil: 'domcontentloaded' });
    assert.match(await page.locator('#face-status').innerText(), /file:\/\//);
    assert.match(await page.locator('.face-local-help').innerText(), /start-local\.cmd/);
    assert.equal(await page.locator('#face-reference').isDisabled(), true);
    // Drag and drop must also guard file mode before requesting any model assets.
    await page.evaluate(() => {
      const transfer = new DataTransfer(); transfer.items.add(new File(['image'], 'photo.jpg', { type: 'image/jpeg' }));
      document.querySelector('#face-dropzone').dispatchEvent(new DragEvent('drop', { dataTransfer: transfer, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(() => document.querySelector('#face-status').textContent.includes('Nhấp đúp start-local.cmd'));
    assert.deepEqual(models, [], 'file mode never requests model manifests, shards or scripts');
    assert.equal(await page.locator('#face-reference').isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('File-mode checks passed: clear launch instructions, disabled input and guarded drop, no model/CORS requests.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
