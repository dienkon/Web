import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_SAMPLE_OUTPUT ?? 'artifacts/sample-lifecycle');
mkdirSync(output, { recursive: true });
const report = { assertions: {}, errors: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(60000);
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => {
  if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text());
});
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
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#manual-lab canvas').waitFor();
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { SimulationEngine } = await import(loaded(/\/SimulationEngine\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    app.getState().resetWorkbench();
    app.setState({ language: 'vi', isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false,
      rightSidebarOpen: true, activeTool: 'none', wasteMass_g: 0, wasteContents: [] });
    app.getState().addVessel('beaker', 'Mẫu kiểm tra vòng đời');
    const id = app.getState().vesselIds.at(-1), shell = app.getState().vessels[id];
    const sample = { ...shell, position: [0, -.135, 0], volume_ml: .12, volume: .12 / shell.capacity_ml,
      mass_g: .12001, contents: [
        { formula: 'H2O', phase: 'l', mass_g: .12, moles: .12 / 18.015 },
        { formula: 'BaSO4', phase: 's', mass_g: .00001, moles: .00001 / 233.39, solidOrigin: 'precipitate' },
      ], substances: ['H2O', 'BaSO4'], hasPrecipitate: true, precipitateSubstance: 'BaSO4' };
    app.setState({ vessels: { [id]: sample }, vesselIds: [id], selectedVesselId: id });
    let mounted;
    for (let i = 0; i < 300 && !mounted; i++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (!mounted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!mounted) throw new Error('Manual 3D root did not mount');
    const root = mounted.store;
    window.__sampleAudit = { app, id, root, engine: SimulationEngine };
  });
  await page.waitForFunction(() => window.__sampleAudit.engine.findManager(window.__sampleAudit.id));
  await page.evaluate(() => {
    const a = window.__sampleAudit;
    a.engine.findManager(a.id).step(a.app.getState().vessels[a.id], .1, { thermalStateAuthoritative: true });
    a.root.getState().invalidate();
  });
  await page.waitForFunction(() => {
    const a = window.__sampleAudit;
    const mesh = a.root.getState().scene.getObjectByName(`physical_precipitate_${a.id}_BaSO4`);
    return mesh?.visible && mesh.count > 0;
  }, undefined, { timeout: 15000 }).catch(async error => {
    report.microDebug = await page.evaluate(() => {
      const a = window.__sampleAudit, names = [];
      a.root.getState().scene.traverse(node => { if (/physical_|sediment_/.test(node.name)) names.push({ name: node.name, visible: node.visible, count: node.count }); });
      const manager = a.engine.findManager(a.id);
      return { sample: a.app.getState().vessels[a.id], names,
        populations: [...manager.precipitationSystems].map(([key, system]) => ({ key, count: system.particles.length, mass_g: system.representedMass_g })) };
    });
    throw error;
  });
  report.micro = await page.evaluate(() => {
    const a = window.__sampleAudit, mesh = a.root.getState().scene.getObjectByName(`physical_precipitate_${a.id}_BaSO4`);
    return { volume_ml: a.app.getState().vessels[a.id].volume_ml, visible: mesh.visible, count: mesh.count,
      representedMass_g: a.engine.findManager(a.id).precipitationSystem.representedMass_g };
  });
  report.assertions.microPrecipitateVisible = report.micro.visible && report.micro.count > 0
    && Math.abs(report.micro.volume_ml - .12) < 1e-10 && Math.abs(report.micro.representedMass_g - .00001) < 1e-10;
  await page.screenshot({ path: resolve(output, '01-micro-precipitate.png') });
  await page.evaluate(() => {
    const a = window.__sampleAudit, s = a.app.getState(), sample = s.vessels[a.id];
    a.app.setState({ vessels: { [a.id]: { ...sample, volume_ml: 20, volume: 20 / sample.capacity_ml,
      mass_g: 20.01, temperature_c: 60, foam_ml: 2,
      wallCondensation: { inner_g: .004, outer_g: .006, innerBeads: [], outerBeads: [], returned_g: 0 },
      contents: [
        { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 },
        { formula: 'BaSO4', phase: 's', mass_g: .01, moles: .01 / 233.39, solidOrigin: 'precipitate' },
      ] } } });
  });
  await page.getByRole('button', { name: 'Làm rỗng', exact: true }).click();
  report.empty = await page.evaluate(() => {
    const a = window.__sampleAudit, s = a.app.getState(), v = s.vessels[a.id];
    return { vessel: structuredClone(v), wasteMass_g: s.wasteMass_g,
      wasteContentsMass_g: s.wasteContents.reduce((sum, row) => sum + row.mass_g, 0),
      particles: a.engine.findManager(a.id)?.precipitationSystem.particles.length };
  });
  report.assertions.cleanResetsQuantityAndEffects = report.empty.vessel.mass_g === 0 && report.empty.vessel.volume_ml === 0
    && report.empty.vessel.contents.length === 0 && report.empty.vessel.foam_ml === 0
    && report.empty.vessel.wallCondensation.inner_g === 0 && report.empty.vessel.wallCondensation.outer_g === 0
    && report.empty.particles === 0;
  report.assertions.collectsFiniteContentsAndWallWater = Math.abs(report.empty.wasteMass_g - 20.02) < 1e-8
    && Math.abs(report.empty.wasteContentsMass_g - 20.02) < 1e-8;
  report.assertions.retainsGlassTemperature = report.empty.vessel.temperature_c === 60;
  await page.getByRole('button', { name: 'Làm rỗng', exact: true }).click();
  report.assertions.repeatDoesNotDuplicateWaste = await page.evaluate(() => Math.abs(window.__sampleAudit.app.getState().wasteMass_g - 20.02) < 1e-8);
  report.refill = await page.evaluate(async () => {
    const a = window.__sampleAudit, s = a.app.getState(), empty = s.vessels[a.id];
    const source = { ...empty, id: 'refill-source', name: 'Nước cấp lại', position: [-3, -.135, 0],
      temperature_c: 25, volume_ml: 5, volume: 5 / empty.capacity_ml, mass_g: 5,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 5, moles: 5 / 18.015 }], substances: ['H2O'] };
    a.app.setState({ vessels: { ...s.vessels, [source.id]: source }, vesselIds: [...s.vesselIds, source.id] });
    a.app.getState().transferLiquidContinuous(source.id, a.id, 1);
    const next = a.app.getState();
    return { receiverMass_g: next.vessels[a.id].mass_g, receiverVolume_ml: next.vessels[a.id].volume_ml,
      sourceMass_g: next.vessels[source.id].mass_g, wasteMass_g: next.wasteMass_g };
  });
  report.assertions.emptyVesselAcceptsNewLiquid = Math.abs(report.refill.receiverVolume_ml - 1) < 1e-8
    && Math.abs(report.refill.receiverMass_g - 1) < 1e-8 && Math.abs(report.refill.sourceMass_g - 4) < 1e-8
    && Math.abs(report.refill.wasteMass_g - 20.02) < 1e-8;
  await page.screenshot({ path: resolve(output, '02-emptied-and-refilled.png') });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  assert.ok(Object.values(report.assertions).every(Boolean), JSON.stringify(report.assertions));
  console.log(JSON.stringify(report.assertions, null, 2));
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
