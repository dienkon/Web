import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

// Serve only the production build under a prefix. Root asset requests must fail,
// just as they do when ChemDex hosts this game at /lab-safety/.
const dist = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const prefix = ['/lab-safety/', '/nested/lab-safety/'].find(p => pathname.startsWith(p));
    if (!prefix) { res.writeHead(404).end(); return; }
    const relative = decodeURIComponent(pathname.slice(prefix.length)) || 'index.source.html';
    const file = path.resolve(dist, relative);
    if (!file.startsWith(dist + path.sep)) { res.writeHead(404).end(); return; }
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
  await mkdir('.browser-review/public-assets', { recursive: true });
  for (const prefix of ['/lab-safety/', '/nested/lab-safety/']) {
    const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
    const errors = [], failures = [], images = new Set();
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (!response.url().startsWith(origin)) return;
      if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`);
      if (response.ok() && response.url().includes('/SYMBOLS-IMG/')) images.add(response.url());
    });
    await page.addInitScript(() => {
      localStorage.setItem('labSafetySettings', JSON.stringify({ graphicsQuality: 'ultra', reduceMotion: true }));
    });
    await page.goto(origin + prefix);
    await page.locator('.start-primary').waitFor();
    await page.waitForFunction(() => document.querySelector('canvas')?.width > 0);
    // The nine wall symbols and the ultra-quality teacher are loaded by the
    // actual scene; checking HTTP alone would miss a React loader exception.
    await page.waitForFunction(() => performance.getEntriesByType('resource')
      .filter(r => r.name.includes('/SYMBOLS-IMG/')).length >= 9);
    await page.waitForFunction(() => performance.getEntriesByType('resource')
      .some(r => r.name.endsWith('/teacher.glb')));
    await page.locator('.start-primary').click();
    await page.waitForFunction(() => document.documentElement.classList.contains('game-active'));
    await page.waitForFunction(() => !document.querySelector('.start-shell'));
    // Decode every symbol, including the two biological warnings used in the
    // practical exercise, rather than accepting an HTML fallback with status 200.
    const symbols = (await readdir(path.join(dist, 'SYMBOLS-IMG'))).filter(n => n.endsWith('.png'));
    assert.equal(symbols.length, 11);
    const sizes = await page.evaluate(async files => Promise.all(files.map(async file => {
      const image = new Image();
      image.src = `./SYMBOLS-IMG/${file}`;
      await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })), symbols);
    assert.ok(sizes.every(([w, h]) => w > 0 && h > 0));
    await page.screenshot({ path: `.browser-review/public-assets/${prefix.includes('nested') ? 'nested' : 'game'}.png` });
    assert.equal(images.size, 11, 'all symbol requests stay under the game path');
    assert.deepEqual(failures, [], 'no missing local assets');
    assert.deepEqual(errors, [], 'no runtime exceptions while entering the game');
    console.log(`PASS ${prefix}: game entry, 11 decoded signs, ultra teacher, no missing assets or runtime errors`);
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise(resolve => server.close(resolve));
}
