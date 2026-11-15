import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: process.env.BROWSER_CHANNEL ?? 'chrome', headless: true });
const snapshots = {};
try {
  const page = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(/https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort());
  await page.addInitScript(() => {
    localStorage.setItem('labSafetySettings', JSON.stringify({ graphicsQuality: 'auto', reduceMotion: true }));
    Element.prototype.requestFullscreen = async () => { throw new DOMException('Fullscreen unavailable', 'NotAllowedError'); };
  });
  await page.goto(process.env.P0_APP_URL ?? 'http://127.0.0.1:3000/?debug=1', { waitUntil: 'domcontentloaded' });
  await page.locator('.start-shell').waitFor();
  await page.getByRole('button', { name: 'Mở toàn màn hình · xoay ngang' }).click();
  await page.waitForFunction(() => !document.querySelector('.orientation-gate'));
  await page.evaluate(async () => {
    const fiberUrl = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/node_modules/.vite/deps/@react-three_fiber.js')?.name;
    if (!fiberUrl) throw Error('R3F resource not found');
    window.qualityFiber = await import(fiberUrl);
    window.qualityStore = (await import('/src/store/useStore.ts')).useStore;
    window.qualityRoot = () => [...window.qualityFiber._roots.values()].map(root => root.store.getState()).find(state => state.scene.getObjectByName('lab-room'));
  });
  await page.waitForFunction(() => window.qualityRoot());
  const inspect = () => page.evaluate(() => {
    const state = window.qualityRoot();
    const canvas = state.gl.domElement;
    const hud = document.querySelector('.lab-hud');
    const bounds = hud?.getBoundingClientRect();
    return {
      pixelRatio: state.gl.getPixelRatio(),
      viewportDpr: state.viewport.dpr,
      antialias: state.gl.getContext().getContextAttributes().antialias,
      canvasCssWidth: canvas.getBoundingClientRect().width,
      canvasWidth: canvas.width,
      devicePixelRatio: window.devicePixelRatio,
      ui: bounds && { width: bounds.width, height: bounds.height, fontSize: getComputedStyle(hud).fontSize },
    };
  });
  const commit = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)))));
  snapshots.initial = await inspect();
  assert.equal(snapshots.initial.devicePixelRatio, 2);
  assert.equal(snapshots.initial.pixelRatio, 1, 'mobile auto starts at native CSS-pixel clarity');
  assert.equal(snapshots.initial.antialias, true, 'mobile auto keeps antialiasing enabled');
  await page.evaluate(() => window.qualityStore.getState().startGame());
  await page.locator('.lab-hud').waitFor();
  snapshots.before = await inspect();
  // Invoke only the real adaptive subscriber with deterministic 20 fps samples.
  // Do not advance/reset the R3F clock or alter the other simulation callbacks.
  await page.evaluate(() => {
    const state = window.qualityRoot();
    const callback = state.internal.subscribers.find(subscriber => subscriber.ref.current.toString().includes('current.slow')).ref.current;
    for (let frame = 0; frame < 160; frame++) callback(state, .05);
  });
  await commit();
  snapshots.adapted = await inspect();
  assert.ok(snapshots.adapted.pixelRatio < 1 && snapshots.adapted.pixelRatio >= .7, 'slow frames reduce scene resolution');
  assert.equal(snapshots.adapted.viewportDpr, snapshots.adapted.pixelRatio);
  assert.ok(snapshots.adapted.canvasWidth < snapshots.before.canvasWidth);
  assert.deepEqual(snapshots.adapted.ui, snapshots.before.ui, 'adaptive resolution preserves CSS HUD dimensions and text sizing');
  const learned = snapshots.adapted.pixelRatio;
  for (const patch of [{ cameraSensitivity: 1.2 }, { reduceMotion: false }]) {
    await page.evaluate(settings => window.qualityStore.getState().updateSettings(settings), patch);
    await commit();
    const state = await inspect();
    assert.equal(state.pixelRatio, learned, 'LabScene rerender retains the learned adaptive DPR');
    assert.deepEqual(state.ui, snapshots.before.ui);
  }
  snapshots.presets = [];
  for (const [graphicsQuality, dpr] of [['low', .85], ['medium', 1], ['high', 1.25]]) {
    await page.evaluate(graphicsQuality => window.qualityStore.getState().updateSettings({ graphicsQuality }), graphicsQuality);
    await page.waitForFunction(expected => Math.abs(window.qualityRoot().gl.getPixelRatio() - expected) < 1e-6, dpr);
    await commit();
    const state = await inspect();
    assert.equal(state.pixelRatio, dpr);
    assert.equal(state.viewportDpr, dpr);
    assert.deepEqual(state.ui, snapshots.before.ui);
    snapshots.presets.push({ graphicsQuality, ...state });
  }
  assert.deepEqual(errors, []);
  await mkdir('.browser-review/adaptive-quality', { recursive: true });
  await writeFile('.browser-review/adaptive-quality/audit.json', JSON.stringify({ passed: true, snapshots, errors }, null, 2));
  console.log('PASS mobile auto DPR 1 + AA, slow-frame adaptation, rerender retention, low/medium/high presets, unchanged CSS HUD');
} finally { await browser.close(); }
