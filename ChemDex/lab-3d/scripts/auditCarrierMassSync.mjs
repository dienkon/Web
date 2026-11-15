import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/carrier-mass-sync');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], checks: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.routeWebSocket('**', () => {});
  await page.route('**/api/**', route => route.abort());
  page.on('pageerror', error => { if (!report.errors.includes(error.stack)) report.errors.push(error.stack); });
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(message.text())) report.shaderErrors.push(message.text());
  });
  await page.addInitScript(() => {
    const original = Worker.prototype.postMessage;
    window.carrierWorkerRequests = [];
    Worker.prototype.postMessage = function(message, ...rest) {
      const stock = message?.input?.containers && message?.input?.contacts;
      if (stock) window.carrierWorkerRequests.push(structuredClone(message));
      const result = original.call(this, message, ...rest);
      if (stock && window.carrierAfterPost) window.carrierAfterPost(message);
      return result;
    };
  });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.evaluate(async () => {
    const module = async pathname => import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === pathname)?.name ?? pathname);
    const { useAppStore: app } = await module('/src/store/useAppStore.ts');
    const { useQualityStore } = await module('/src/vfx/quality.ts');
    const { _roots } = await module('/node_modules/.vite/deps/@react-three_fiber.js');
    const { getProgramById } = await module('/src/vfx/programs/library/index.ts');
    const { planStudioProgram } = await module('/src/engine/studioProgram.ts');
    const { vesselLocalToWorld } = await module('/src/science/vesselScale.ts');
    const { Matrix4, Vector3 } = await module('/node_modules/.vite/deps/three.js');
    useQualityStore.getState().setPreference('low');
    app.setState({ vessels: {}, vesselIds: [], selectedVesselId: null, burners: {}, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, inFlightPours: [], spills: {}, pouringChemical: null, isSimulationPaused: true,
      timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false, moveMode: false, activeTool: 'none' });
    app.getState().addVessel('beaker', 'Kiểm tra hạt ướt và khô');
    const id = app.getState().vesselIds[0];
    const sample = { ...app.getState().vessels[id], position: [0, -0.135, 0], rotationY: 0, rotationZ: 0,
      capacity_ml: 100, volume_ml: 30, volume: 0.3, temperature_c: 25, ph: 1,
      contents: [{ formula: 'Zn', phase: 's', mass_g: 0.2, moles: 0.2 / 65.38, initialMass_g: 0.2 },
        { formula: 'HCl', phase: 'aq', mass_g: 0.02 * 36.458, moles: 0.02 },
        { formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }],
      substances: ['Zn', 'HCl', 'H2O'], isLocked: true, hasGas: false, isSealed: false, isShattered: false };
    sample.mass_g = sample.contents.reduce((sum, row) => sum + row.mass_g, 0);
    sample.stockMotion = { tick: 0, grains: [-0.7, 0.6].map((y, i) => ({ id: i ? 'audit-dry' : 'audit-wet', formula: 'Zn',
      mass_g: 0.1, scale_m: Math.cbrt(0.1 / 7.14 * 1e-6),
      position_m: vesselLocalToWorld(sample, [i ? 0.25 : -0.25, y, 0]).map(value => value * 0.035),
      rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false })) };
    const kinetics = planStudioProgram(getProgramById('zn_hcl'), sample, 'vi').kinetics;
    app.setState({ vessels: { [id]: sample }, activeKinetics: { [id]: kinetics }, selectedVesselId: null });
    const rootRecord = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas'));
    const root = () => rootRecord.store.getState();
    window.carrierAudit = { app, id, root, vesselLocalToWorld,
      read: () => {
        const v = app.getState().vessels[id], mesh = root().scene.getObjectByName(`stock_solid_${id}_Zn`);
        const rendered = [];
        if (mesh) for (let i = 0; i < mesh.count; i++) {
          const matrix = new Matrix4(); mesh.getMatrixAt(i, matrix);
          rendered.push({ position: new Vector3().setFromMatrixPosition(matrix).toArray(), scale: new Vector3().setFromMatrixScale(matrix).toArray() });
        }
        return { grains: structuredClone(v.stockMotion?.grains ?? []), tick: v.stockMotion?.tick, rendered,
          macroMass_g: v.contents.filter(row => row.formula === 'Zn' && row.phase === 's').reduce((sum, row) => sum + row.mass_g, 0),
          progress: app.getState().activeKinetics[id]?.progress, escapedGas_g: v.escapedGas_g };
      } };
    root().internal.subscribe({ current: ({ camera }) => { camera.position.set(0, 2.1, 5.3); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(); } }, 0,
      rootRecord.store);
  });
  await page.waitForFunction(() => window.carrierAudit.read().rendered.length === 2 && window.carrierWorkerRequests.length > 0);
  await page.waitForTimeout(400);
  const initial = await page.evaluate(() => window.carrierAudit.read());
  report.checks.push({ phase: 'initial', ...initial });
  assert.equal(await page.evaluate(() => { const a = window.carrierAudit; return a.app.getState().seekStudioProgram(a.id, 0.25); }), true);
  await page.waitForTimeout(500);
  const partial = await page.evaluate(() => window.carrierAudit.read());
  report.checks.push({ phase: 'wet-only-consumption', ...partial });
  assert(Math.abs(partial.grains.find(g => g.id === 'audit-wet').mass_g - 0.05) < 1e-10);
  assert.equal(partial.grains.find(g => g.id === 'audit-dry').mass_g, 0.1);
  assert.deepEqual(partial.grains.find(g => g.id === 'audit-dry').position_m, initial.grains.find(g => g.id === 'audit-dry').position_m);
  assert(partial.rendered.some(item => Math.abs(item.scale[0] / initial.rendered[0].scale[0] - Math.cbrt(0.5)) < 1e-5));
  await page.screenshot({ path: path.join(output, '01-wet-grain-shrinks.png') });
  await page.evaluate(() => {
    const a = window.carrierAudit;
    window.carrierAfterPost = request => {
      if (request.paused || !request.path.length) return;
      window.carrierAfterPost = null;
      window.carrierConcurrentRequest = structuredClone(request);
      window.carrierConcurrentSeek = a.app.getState().seekStudioProgram(a.id, 0.375);
      a.app.setState({ isSimulationPaused: true });
    };
    a.app.setState({ isSimulationPaused: false });
  });
  await page.waitForFunction(() => window.carrierConcurrentRequest && window.carrierAudit.read().tick > 0);
  await page.waitForTimeout(500);
  const moving = await page.evaluate(() => ({ ...window.carrierAudit.read(), seek: window.carrierConcurrentSeek,
    request: window.carrierConcurrentRequest }));
  assert.equal(moving.seek, true);
  assert(Math.abs(moving.grains.find(g => g.id === 'audit-wet').mass_g - 0.025) < 1e-9);
  assert.equal(moving.grains.find(g => g.id === 'audit-dry').mass_g, 0.1);
  assert.notDeepEqual(moving.grains.find(g => g.id === 'audit-dry').position_m, partial.grains.find(g => g.id === 'audit-dry').position_m);
  assert.equal(moving.request.input.containers[0].restore, false);
  report.checks.push({ phase: 'chemistry-during-worker-step', ...moving });
  assert.equal(await page.evaluate(() => { const a = window.carrierAudit; return a.app.getState().seekStudioProgram(a.id, 0.5); }), true);
  await page.waitForFunction(() => window.carrierAudit.read().grains.length === 1);
  const exhausted = await page.evaluate(() => window.carrierAudit.read());
  assert.equal(exhausted.grains[0].id, 'audit-dry');
  assert.equal(exhausted.grains[0].mass_g, 0.1);
  assert.equal(await page.evaluate(() => { const a = window.carrierAudit; return a.app.getState().seekStudioProgram(a.id, 1); }), false);
  report.checks.push({ phase: 'wet-exhausted-dry-protected', ...exhausted });
  await page.screenshot({ path: path.join(output, '02-dry-grain-preserved.png') });
  await page.evaluate(() => {
    const a = window.carrierAudit, old = a.app.getState().vessels[a.id];
    const grains = old.stockMotion.grains.map(g => ({ ...g, position_m: a.vesselLocalToWorld(old, [0.25, -0.7, 0]).map(value => value * 0.035) }));
    a.app.getState().setVesselState(a.id, { stockMotion: { tick: old.stockMotion.tick + 1, grains } });
  });
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => { const a = window.carrierAudit; return a.app.getState().seekStudioProgram(a.id, 1); }), true);
  await page.waitForTimeout(300);
  const finished = await page.evaluate(() => window.carrierAudit.read());
  assert(Math.abs(finished.macroMass_g) < 1e-10);
  assert(Math.abs(finished.escapedGas_g.H2 - 0.2 / 65.38 * 2.016) < 1e-9);
  report.checks.push({ phase: 'rewet-completes-conserved-yield', ...finished });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await writeFile(path.join(output, 'audit.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ phases: report.checks.map(check => check.phase), errors: report.errors, shaderErrors: report.shaderErrors }));
