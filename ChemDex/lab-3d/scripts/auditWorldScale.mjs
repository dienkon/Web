import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auditExteriorOverflow } from './auditOverflowTransport.mjs';

const output = path.resolve(process.env.WORLD_SCALE_AUDIT_OUTPUT ?? 'docs/research/world-scale-2026-10-29');
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.scaleRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.scaleRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { vesselBodyTransform } = await import('/src/science/vesselScale.ts');
    const { vesselInterior } = await import('/src/science/vesselDimensions.ts');
    const { getVesselProfile, getWorldVesselProfile } = await import('/src/pour/physics/profiles.ts');
    const scene = [...window.scaleRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState().scene;
    store.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, pipetteSample: null, inFlightPours: [], spills: {}, isSimulationPaused: true,
      timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false });
    const definitions = [['beaker', 100], ['flask', 250], ['test_tube', 50], ['cylinder', 100]];
    for (const [type] of definitions) store.getState().addVessel(type, type);
    const ids = Object.keys(store.getState().vessels), vessels = {};
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i], [type, capacity_ml] = definitions[i];
      vessels[id] = { ...store.getState().vessels[id], type, capacity_ml, volume_ml: capacity_ml,
        volume: 1, mass_g: capacity_ml, temperature_c: 25, rotationZ: 0, rotationY: 0,
        position: [-4.2 + i * 2.8, -0.135, 0], liquidColor: '#37a7cf', substances: ['H2O'],
        contents: [{ formula: 'H2O', phase: 'l', mass_g: capacity_ml, moles: capacity_ml / 18.015 }] };
    }
    store.setState({ vessels, vesselIds: ids, selectedVesselId: null });
    // Independent mesh measurement: integrate actual polygon rings from the
    // uploaded vertex buffer, then apply the rendered matrix determinant.
    const snapshot = () => ids.map(id => {
      const v = store.getState().vessels[id], mesh = scene.getObjectByName(`liquid_volume_${id}`);
      if (!mesh) return null;
      mesh.updateWorldMatrix(true, false);
      const g = mesh.geometry, p = g.attributes.position, rings = g.parameters.points.length, n = g.parameters.segments;
      const plane = mesh.material.clippingPlanes[0].clone().applyMatrix4(mesh.matrixWorld.clone().invert());
      const clipY = -plane.constant / plane.normal.y;
      const areas = [], heights = [];
      for (let j = 0; j < rings; j++) {
        let area = 0;
        for (let i = 0; i < n; i++) {
          const a = i * rings + j, b = ((i + 1) % n) * rings + j;
          area += p.getX(a) * p.getZ(b) - p.getZ(a) * p.getX(b);
        }
        areas.push(Math.abs(area / 2)); heights.push(p.getY(j));
      }
      const integrate = top => {
        let volume = 0;
        for (let j = 1; j < rings; j++) {
          const y0 = heights[j - 1], y1 = heights[j], end = Math.min(y1, top);
          if (!(end > y0) || !(y1 > y0)) continue;
          const a = areas[j - 1], r0 = Math.sqrt(a), r1 = Math.sqrt(areas[j]);
          const b = (r0 + (r1 - r0) * (end - y0) / (y1 - y0)) ** 2;
          volume += (end - y0) * (a + Math.sqrt(a * b) + b) / 3;
        }
        return volume * Math.abs(mesh.matrixWorld.determinant()) * 3.5 ** 3;
      };
      const interior = vesselInterior(v.type), body = vesselBodyTransform(v), profile = getWorldVesselProfile(v.type, v.capacity_ml);
      const rawLip = getVesselProfile(v.type, v.capacity_ml).lipLocal;
      const renderedLip = mesh.position.clone().fromArray(rawLip).applyMatrix4(mesh.parent.matrixWorld);
      return { type: v.type, capacity_ml: v.capacity_ml, stock_ml: v.volume_ml, modelScale: body.scale,
        oldUnscaledInterior_ml: interior.volume * 3.5 ** 3,
        continuumInterior_ml: interior.volume * Math.abs(mesh.matrixWorld.determinant()) * 3.5 ** 3,
        polygonInterior_ml: integrate(Infinity), polygonClipped_ml: integrate(clipY),
        polygonFactor: n * Math.sin(2 * Math.PI / n) / (2 * Math.PI),
        actualScale: mesh.matrixWorld.getMaxScaleOnAxis(), clipY,
        profileMouthY: v.position[1] + profile.lipLocal[1],
        renderedMouthY: renderedLip.y,
        segments: n };
    });
    window.worldScaleAudit = { store, scene, ids, snapshot };
  });
  await page.waitForFunction(() => {
    const rows = window.worldScaleAudit.snapshot();
    return rows.every(r => r && Math.abs(r.polygonClipped_ml / r.polygonFactor - r.stock_ml) < 0.02);
  }, undefined, { timeout: 90000 });
  report.full = await page.evaluate(() => window.worldScaleAudit.snapshot());
  await page.screenshot({ path: path.join(output, '01-full-capacities.png') });
  await page.evaluate(() => {
    const a = window.worldScaleAudit;
    a.store.setState(s => ({ vessels: Object.fromEntries(Object.entries(s.vessels).map(([id, v]) => [id,
      { ...v, volume_ml: v.capacity_ml / 2, mass_g: v.capacity_ml / 2, volume: 0.5,
        contents: v.contents.map(c => ({ ...c, mass_g: c.mass_g / 2, moles: c.moles / 2 })) }])) }));
  });
  await page.waitForFunction(() => window.worldScaleAudit.snapshot().every(r => r && Math.abs(r.polygonClipped_ml / r.polygonFactor - r.stock_ml) < 0.02), undefined, { timeout: 90000 });
  report.half = await page.evaluate(() => window.worldScaleAudit.snapshot());
  for (const row of [...report.full, ...report.half]) {
    if (Math.abs(row.continuumInterior_ml - row.capacity_ml) > 0.001
      || Math.abs(row.polygonClipped_ml / row.polygonFactor - row.stock_ml) > 0.02
      || Math.abs(row.profileMouthY - row.renderedMouthY) > 1e-9)
      throw new Error(`Rendered capacity mismatch: ${JSON.stringify(row)}`);
  }
  await page.screenshot({ path: path.join(output, '02-half-capacities.png') });
  await auditExteriorOverflow(page, output, report);
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ full: report.full, half: report.half, overflowPhases: report.phases.length,
  errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
