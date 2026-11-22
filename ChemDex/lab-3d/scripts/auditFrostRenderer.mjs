import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const output = path.resolve(process.env.LAB_FROST_OUTPUT ?? 'artifacts/frost-renderer');
await mkdir(output, { recursive: true });
const report = { errors: [], samples: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });

try {
  const page = await browser.newPage({ viewport: { width: 1024, height: 768 } });
  await prepareLabAuditSession(page);
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize(10000);
    localStorage.setItem('chemlab_vfx_quality_preference', 'low');
  });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(message.text())) {
      report.errors.push(message.text());
    }
  });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6791');
  const modules = await page.waitForFunction(() => {
    const urls = performance.getEntriesByType('resource').map(entry => entry.name);
    const fiber = urls.findLast(name => /@react-three_fiber\.js(?:\?|$)/.test(name));
    const appUrl = urls.findLast(name => /\/useAppStore\.ts(?:\?|$)/.test(name));
    return fiber && appUrl && { fiber, appUrl };
  }, undefined, { timeout: 90000 });
  await page.evaluate(async ({ fiber, appUrl }) => {
    const { _roots } = await import(fiber);
    const { useAppStore: app } = await import(appUrl);
    window.frostAuditRuntime = { _roots, app };
  }, await modules.jsonValue());
  await page.waitForFunction(() => {
    const canvas = document.querySelector('#manual-lab canvas');
    const root = window.frostAuditRuntime._roots.get(canvas)?.store;
    return !!canvas && root?.getState().gl?.domElement === canvas;
  });
  await page.evaluate(() => {
    const { _roots, app } = window.frostAuditRuntime;
    const root = _roots.get(document.querySelector('#manual-lab canvas')).store;
    app.getState().resetWorkbench();
    app.getState().setSimulationPaused(true);
    const id = app.getState().prepareStudioProgram('nh4no3_dissolution');
    if (!id || !app.getState().runStudioProgram(id)) throw new Error('Failed to start the cooling specimen');

    window.frostAudit = {
      // Hold chemistry paused and vary only the renderer's input temperature.
      setTemperature(temperature_c) {
        app.getState().setVesselState(id, { temperature_c });
        root.getState().invalidate();
      },
      mesh() { return root.getState().scene.getObjectByName(`vessel-frost-${id}`); },
      programId() {
        const mesh = this.mesh();
        return mesh && root.getState().gl.properties.get(mesh.material).currentProgram?.id;
      },
    };
  });

  await page.evaluate(() => window.frostAudit.setTemperature(2));
  assert.equal(await page.evaluate(() => !!window.frostAudit.mesh()), false);
  for (const [temperature, opacity] of [[-1.5, 0.25], [-5, 0.5], [-12, 1]]) {
    await page.evaluate(value => window.frostAudit.setTemperature(value), temperature);
    await page.waitForFunction(value => window.frostAudit.mesh()?.material.opacity === value
      && Number.isInteger(window.frostAudit.programId()), opacity);
    report.samples.push(await page.evaluate(temperature => {
      const { material, geometry } = window.frostAudit.mesh();
      return { temperature, opacity: material.opacity, materialId: material.uuid, geometryId: geometry.uuid,
        programId: window.frostAudit.programId() };
    }, temperature));
  }
  assert.equal(new Set(report.samples.map(sample => sample.materialId)).size, 1, 'Cooling must reuse the frost material');
  assert.equal(new Set(report.samples.map(sample => sample.geometryId)).size, 1, 'Cooling must reuse the frost contour');
  assert.equal(new Set(report.samples.map(sample => sample.programId)).size, 1, 'Cooling must reuse the WebGL program');
  await page.evaluate(() => {
    const audit = window.frostAudit;
    const { material, geometry } = audit.mesh();
    audit.disposed = [];
    material.addEventListener('dispose', () => audit.disposed.push('material'));
    geometry.addEventListener('dispose', () => audit.disposed.push('geometry'));
    audit.setTemperature(2);
  });
  await page.waitForFunction(() => !window.frostAudit.mesh() && window.frostAudit.disposed.length >= 2);
  report.disposed = await page.evaluate(() => [...new Set(window.frostAudit.disposed)].sort());
  assert.deepEqual(report.disposed, ['geometry', 'material']);
  assert.deepEqual(report.errors, []);
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report));
