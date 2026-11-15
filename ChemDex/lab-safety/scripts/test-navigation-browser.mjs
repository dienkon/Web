import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';

const app = process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/';
const platform = path.resolve('../platform');
const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
await mkdir('.browser-review/navigation', { recursive: true });
try {
  for (const [width, height, touch] of [[1366, 768, false], [844, 390, true], [568, 320, true]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
    // Use the real shared platform implementation without changing parent files.
    await page.route('**/platform/**', async route => {
      const file = path.resolve(platform, new URL(route.request().url()).pathname.slice('/platform/'.length));
      if (!file.startsWith(platform + path.sep)) return route.abort();
      await route.fulfill({ body: await readFile(file), contentType: file.endsWith('.css') ? 'text/css' : 'text/javascript' });
    });
    await page.addInitScript(() => localStorage.setItem('chemdex:sidebar-collapsed', 'false'));
    if (touch) await page.addInitScript(() => {
      // Exercise the supported mobile fallback without entering a native
      // fullscreen window, which headless browser input cannot reliably drive.
      Element.prototype.requestFullscreen = async () => { throw new DOMException('Fullscreen unavailable', 'NotAllowedError'); };
    });
    await page.goto(app, { waitUntil: 'domcontentloaded' });
    await page.locator('.start-shell').waitFor();
    if (touch) await page.getByRole('button', { name: 'Mở toàn màn hình · xoay ngang' }).click();
    await page.addStyleTag({ url: '/platform/sidebar.css' });
    await page.addScriptTag({ url: '/platform/sidebar.js', type: 'module' });
    await page.locator('.cd-mobile-toggle').waitFor();
    assert.equal(await page.locator('#chemdex-sidebar').isVisible(), false);
    const bounds = await page.evaluate(() => {
      const root = document.querySelector('#root > .app-shell').getBoundingClientRect();
      const button = document.querySelector('.cd-mobile-toggle').getBoundingClientRect();
      return { x: root.x, y: root.y, width: root.width, height: root.height, buttonWidth: button.width, buttonHeight: button.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
    });
    assert.equal(bounds.x, 0); assert.equal(bounds.y, 0);
    assert.equal(bounds.width, bounds.viewportWidth); assert.equal(bounds.height, bounds.viewportHeight);
    assert.equal(bounds.buttonWidth, 44); assert.equal(bounds.buttonHeight, 44);
    await page.evaluate(async () => (await import('/src/store/useStore.ts')).useStore.getState().startGame());
    await page.waitForFunction(() => document.documentElement.classList.contains('game-active'));
    await page.locator('.cd-mobile-toggle').click();
    await page.waitForFunction(() => document.getElementById('root').inert);
    if (!await page.locator('#chemdex-sidebar a[href="/lab-safety/"]').isVisible()) await page.locator('#chemdex-sidebar summary').click();
    assert.equal(await page.locator('#chemdex-sidebar a[href="/lab-safety/"]').isVisible(), true);
    assert.equal(await page.evaluate(async () => (await import('/src/systems/input/sceneInput.ts')).isSceneInputBlocked()), true);
    const position = await page.evaluate(async () => [...(await import('/src/store/useStore.ts')).playerCoords.position]);
    await page.keyboard.down('w'); await page.waitForTimeout(350); await page.keyboard.up('w');
    assert.deepEqual(await page.evaluate(async () => (await import('/src/store/useStore.ts')).playerCoords.position), position);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('root').inert);
    assert.equal(await page.locator('#chemdex-sidebar').isVisible(), false);
    await page.locator('.cd-mobile-toggle').click();
    await page.locator('.cd-mobile-overlay').click({ position: { x: width - 20, y: 100 } });
    await page.waitForFunction(() => !document.getElementById('root').inert);
    await page.screenshot({ path: `.browser-review/navigation/lab-${width}.png` });

    await page.evaluate(async () => (await import('/src/academy/core/store.ts')).useAcademy.getState().openHub('sort-waste'));
    await page.locator('[data-academy-briefing]').waitFor();
    assert.equal(await page.locator('.academy-sidebar').count(), 0);
    await page.locator('[data-start-challenge]').click();
    await page.locator('.cd-mobile-toggle').click();
    await page.waitForFunction(() => document.getElementById('root').inert);
    const platformPauseTime = await page.locator('.academy-round-counters time').textContent();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.academy-round-counters time').textContent(), platformPauseTime, 'platform drawer pauses the academy round');
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.getElementById('root').inert);
    await page.getByRole('button', { name: 'Mở menu học viện' }).click();
    await page.locator('.academy-sidebar').waitFor();
    const time = await page.locator('.academy-round-counters time').textContent();
    await page.waitForTimeout(1100);
    assert.equal(await page.locator('.academy-round-counters time').textContent(), time);
    assert.equal(await page.locator('.academy-main').evaluate(element => element.inert), true);
    await page.keyboard.press('Escape');
    await page.locator('.academy-sidebar').waitFor({ state: 'detached' });
    assert.equal(await page.locator('.academy-main').evaluate(element => element.inert), false);
    assert.equal(await page.locator('.academy-confirm-overlay').count(), 0, 'Escape closes navigation without exiting the round');
    await page.getByRole('button', { name: 'Đóng học viện' }).click();
    await page.getByRole('button', { name: 'Rời lượt chơi' }).click();
    await page.getByRole('button', { name: 'Mở menu học viện' }).click();
    await page.getByRole('button', { name: 'Từ điển', exact: true }).click();
    await page.getByRole('textbox', { name: 'Tìm khái niệm' }).waitFor();
    assert.equal(await page.locator('.academy-sidebar').count(), 0);
    assert.equal(await page.locator('[data-academy]').evaluate(element => element.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: `.browser-review/navigation/academy-${width}.png` });
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}x${height}: full viewport, compact navigation, input lock, Escape/backdrop, academy pause and navigation`);
    await page.close();
  }
} finally { await browser.close(); }
