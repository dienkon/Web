import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = resolve(process.env.LAB_BURNER_OUTPUT ?? 'artifacts/burner-heat-haze');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { errors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await prepareLabAuditSession(page);
  await page.addInitScript(() => performance.setResourceTimingBufferSize(12000));
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|webgl/i.test(message.text())) report.errors.push(message.text());
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { useQualityStore: quality } = await import(loaded(/\/quality\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    quality.getState().setPreference('high');
    const state = app.getState();
    if (!state.burnerIds.length) state.addBurner();
    const id = app.getState().burnerIds[0];
    if (!app.getState().burners[id].isOn) state.toggleBurner(id);
    state.setSimulationPaused(false);
    window.burnerAudit = {
      app,
      clock: () => {
        const root = _roots.get(document.querySelector('#manual-lab canvas'))?.store.getState();
        let haze, flame;
        root?.scene.traverse(object => {
          const material = object.material;
          if (material?.name === 'burner-heat-haze:' + id) haze = material;
          if (material?.uniforms?.uFlameColor) flame = material;
        });
        return haze && flame ? { haze_s: haze.time, flame_s: flame.uniforms.uTime.value,
          renderedFrames: root.gl.info.render.frame } : null;
      },
    };
  });
  await page.waitForFunction(() => window.burnerAudit.clock()?.flame_s > 0.12, undefined, { timeout: 60000 });
  await page.evaluate(() => window.burnerAudit.app.getState().setSimulationPaused(true));
  const snapshot = () => page.evaluate(() => window.burnerAudit.clock());
  report.paused = await snapshot();
  await page.waitForFunction(frame => window.burnerAudit.clock()?.renderedFrames > frame + 2, report.paused.renderedFrames);
  report.held = await snapshot();
  assert.equal(report.held.haze_s, report.held.flame_s);
  assert.equal(report.held.flame_s, report.paused.flame_s);
  assert.equal(report.held.haze_s, report.paused.haze_s);
  await page.evaluate(() => window.burnerAudit.app.getState().setSimulationPaused(false));
  await page.waitForFunction(time => window.burnerAudit.clock()?.flame_s > time + 0.1, report.held.flame_s);
  report.resumed = await snapshot();
  assert.equal(report.resumed.haze_s, report.resumed.flame_s);
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
