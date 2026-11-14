import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('artifacts/reaction-gas-sources');
await mkdir(output, { recursive: true });
const report = { errors: [], experiments: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.routeWebSocket('**', () => {});
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram/i.test(m.text())) report.errors.push(m.text()); });
  for (const id of ['zn_hcl', 'h2o2_mno2']) {
    await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/?mode=auto`, { waitUntil: 'domcontentloaded' });
    await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
    const title = await page.evaluate(async id => {
      const resource = performance.getEntriesByType('resource').find(r => /\/AutoExperiment\.ts(\?|$)/.test(r.name));
      const { AutoExperiment, AUTO_EXPERIMENTS } = await import(resource.name), tick = AutoExperiment.prototype.tick;
      AutoExperiment.prototype.tick = function (dt) { window.gasEffectAudit = this; return tick.call(this, dt); };
      return AUTO_EXPERIMENTS.find(e => e.id === id).title;
    }, id);
    await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill(title);
    await page.getByText(title, { exact: true }).first().click();
    await page.waitForFunction(id => window.gasEffectAudit?.program.id === id, id);
    const result = await page.evaluate(async () => {
      const e = window.gasEffectAudit; e.paused = false; e.speed = 1;
      for (let i = 0; i < 15000 && e.physics.boilingSystem.bubbles.length < 8 && !e.error; i++) e.tick(1 / 60);
      e.paused = true;
      const module = path => import(performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path)?.name ?? path);
      const { reactionGasSources } = await module('/src/science/reactionGasSources.ts');
      const sources = reactionGasSources(e.sample, e.program);
      const bubbles = e.physics.boilingSystem.bubbles;
      return { id: e.program.id, error: e.error, phase: e.phase, progress: e.progress,
        born: e.physics.boilingSystem.sourceSampling.reactionGlyphsBorn, count: bubbles.length,
        sources: sources?.length ?? 0, sourceHeights: sources?.map(s => s.point[1]),
        finite: bubbles.every(b => [b.x, b.y, b.z, b.radius].every(Number.isFinite)),
        chemicalOnly: bubbles.every(b => b.source === 'reaction') };
    });
    assert(!result.error, result.error);
    assert(result.count >= 8 && result.born >= 8 && result.sources > 0 && result.sources <= 128, JSON.stringify(result));
    assert(result.finite && result.chemicalOnly);
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(output, `${id}.png`) });
    report.experiments.push(result);
  }
  assert.equal(report.errors.length, 0, JSON.stringify(report));
} finally {
  await browser.close();
  await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
