import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_AUTO_LAYOUT_OUTPUT ?? 'artifacts/auto-layout');
mkdirSync(output, { recursive: true });
const report = { errors: [], viewports: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(60000);
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Other traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(12000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
try {
  await page.goto(`${process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767'}/?mode=auto`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor();
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => /\/AutoExperiment\.ts(?:\?|$)/.test(name));
    const { AutoExperiment } = await import(url), tick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (dt) {
      if (!window.__layoutExperiment) this.paused = true;
      window.__layoutExperiment = this; return tick.call(this, dt);
    };
  });
  await page.getByRole('button', { name: /^CuSO4 \+ NaOH/ }).first().click();
  await page.waitForFunction(() => !!window.__layoutExperiment);
  await page.locator('#automatic-lab canvas').waitFor();
  for (const viewport of [{ width: 1440, height: 960 }, { width: 390, height: 844 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    for (const longCaption of [false, true]) {
      await page.evaluate(longCaption => {
        const e = window.__layoutExperiment;
        e.error = longCaption ? 'Bình nhận không tiếp nhận được mẫu. Kiểm tra lại lượng chất và vị trí dụng cụ trước khi tiếp tục. '.repeat(5) : null;
      }, longCaption);
      await page.waitForTimeout(450);
      const layout = await page.evaluate(() => {
        const box = node => {
          const r = node.getBoundingClientRect();
          return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
        };
        const scene = document.querySelector('[data-testid="auto-experiment-scene"]');
        const caption = document.querySelector('[data-testid="auto-caption"]');
        const playback = document.querySelector('#automatic-lab [data-auto-phase]');
        const controls = [...playback.querySelectorAll('button, select, input')].map(node => ({ label: node.getAttribute('aria-label'), ...box(node) }));
        return { scene: box(scene), caption: box(caption.parentElement), controls,
          overflow: document.documentElement.scrollWidth > innerWidth,
          overlap: box(scene).bottom - box(caption.parentElement).y,
          canvas: box(scene.querySelector('canvas')) };
      });
      const checks = {
        captionDoesNotCoverScene: layout.overlap <= 1,
        controlsRemainOnscreen: layout.controls.every(b => b.x >= -1 && b.y >= -1 && b.right <= viewport.width + 1 && b.bottom <= viewport.height + 1),
        usableScene: layout.scene.height >= 120,
        noHorizontalOverflow: !layout.overflow,
      };
      report.viewports.push({ viewport, longCaption, layout, checks });
      await page.screenshot({ path: resolve(output, `${viewport.width}x${viewport.height}-${longCaption ? 'long' : 'normal'}.png`) });
    }
  }
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  if (!process.env.LAB_LAYOUT_BASELINE) {
    assert.equal(report.errors.length, 0, 'No runtime errors');
    assert.ok(report.viewports.every(row => Object.values(row.checks).every(Boolean)), 'Automatic layout assertions');
  }
  console.log(JSON.stringify(report.viewports.map(({ viewport, longCaption, checks, layout }) => ({ viewport, longCaption, checks, sceneHeight: layout.scene.height, overlap: layout.overlap })), null, 2));
} finally { await browser.close(); }
