import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.SEDIMENT_AUDIT_OUTPUT ?? 'docs/research/sediment-surface-2026-10-30');
await mkdir(output, { recursive: true });
const report = { method: 'Actual app, controlled declared PbI2 crystal-plate specimen, finite settling, real PourController pose and rendered bed mesh. Manual accepted population time while app paused isolates mechanics; not a measured avalanche speed or recrystallization experiment.', cases: [], errors: [], consoleErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', route => route.abort()); const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.bedRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.bedRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { useQualityStore: quality } = await import('/src/vfx/quality.ts');
    const { mobileSolidInventory } = await import('/src/science/suspensionTransport.ts');
    const scene = [...window.bedRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState().scene;
    const a = { store, scene, SimulationEngine, PourController, quality };
    const manager = () => SimulationEngine.getManager(a.sourceId);
    const setup = type => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null }));
      PourController.getSession(); SimulationEngine.clearAll();
      store.getState().addVessel(type, 'Mẫu cặn tinh thể có sẵn'); store.getState().addVessel('beaker', 'Bình nhận');
      [a.sourceId, a.targetId] = Object.keys(store.getState().vessels);
      store.setState(s => ({ vessels: { [a.sourceId]: { ...s.vessels[a.sourceId], capacity_ml: type === 'test_tube' ? 50 : type === 'flask' ? 250 : 100,
        position: [-2.5, -0.135, 0], rotationY: 0.6, volume_ml: 30, mass_g: 30.5, temperature_c: 25,
        substances: ['H2O', 'PbI2'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
          { formula: 'PbI2', phase: 's', solidOrigin: 'precipitate', precipitateFormation: 'CRYSTAL_PLATE', mass_g: 0.5, moles: 0.5 / 461.008 }],
        liquidColor: '#ffffff', hasPrecipitate: true, precipitateSubstance: 'PbI2', precipitateMorphology: 'CRYSTAL_PLATE' },
        [a.targetId]: { ...s.vessels[a.targetId], position: [2, -0.135, 0], capacity_ml: 500, volume_ml: 0, mass_g: 0, contents: [], substances: [] } } }));
    };
    const advance = seconds => {
      const body = scene.getObjectByName(`vessel_si_body_${a.sourceId}`); body.updateWorldMatrix(true, false);
      const matrix = body.matrixWorld.toArray(), vessel = store.getState().vessels[a.sourceId];
      for (let t = 0; t < seconds - 1e-10; t += 1) manager().step(vessel, Math.min(1, seconds - t), { thermalStateAuthoritative: true, agitation: 0, bodyMatrixWorld: matrix });
    };
    const snapshot = () => {
      const v = store.getState().vessels[a.sourceId], mgr = manager(), bed = mgr.sedimentBed;
      const mesh = scene.getObjectByName(`sediment_bed_${a.sourceId}`); if (!mesh?.visible || !bed.surfacePlane) return null;
      mesh.updateWorldMatrix(true, false);
      const p = mesh.geometry.attributes.position, index = mesh.geometry.index; if (!index) return null;
      let volume = 0, mx = 0, my = 0, mz = 0;
      for (let i = 0; i < index.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map(j => { const k = index.getX(i + j); return [p.getX(k), p.getY(k), p.getZ(k)]; });
        const d = (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
        volume += d; mx += d * (a[0] + b[0] + c[0]) / 4; my += d * (a[1] + b[1] + c[1]) / 4; mz += d * (a[2] + b[2] + c[2]) / 4;
      }
      const center = mesh.position.clone().set(mx / volume, my / volume, mz / volume).applyMatrix4(mesh.matrixWorld);
      const up = mesh.position.clone().set(0, 1, 0).transformDirection(mesh.matrixWorld.clone().invert());
      const normal = bed.surfacePlane.normal, slope = Math.acos(Math.max(-1, Math.min(1, normal[0] * up.x + normal[1] * up.y + normal[2] * up.z)));
      const sample = mobileSolidInventory(v, mgr)['PbI2'];
      return { mass_g: bed.amount_g, target_ml: bed.packedVolume_ml, mesh_ml: Math.abs(volume * mesh.matrixWorld.determinant()) * 3.5 ** 3,
        centerWorld: center.toArray(), slope_rad: slope, plane: bed.surfacePlane, status: bed.surfaceStatus, relaxationTime_s: bed.relaxationTime_s,
        mobile_g: sample?.suspendedMass_g ?? 0, population_g: mgr.precipitationSystem.representedMass_g,
        actualStock_g: v.contents.filter(c => c.formula === 'PbI2').reduce((n, c) => n + c.mass_g, 0),
        geometryIndexCount: index.count, material: JSON.stringify({ volume_ml: v.volume_ml, mass_g: v.mass_g, contents: v.contents }) };
    };
    const tilt = () => {
      PourController.beginPour({ sourceId: a.sourceId, targetId: a.targetId, mode: 'HAND_TILT', assist: 'low' }); PourController.setTilt(1.15);
      store.setState({ isSimulationPaused: false });
      for (let i = 0; i < 80; i++) { PourController.tick(1 / 60, undefined, false, 1); if ((PourController.getSession()?.tilt ?? 0) > 0.95) break; }
      store.setState({ isSimulationPaused: true });
    };
    Object.assign(a, { setup, advance, snapshot, tilt }); window.bedAudit = a;
  });
  const waitMesh = () => page.waitForFunction(() => {
    const s = window.bedAudit.snapshot(); return s && Math.abs(s.mesh_ml - s.target_ml) < 0.0001;
  }, undefined, { timeout: 90000 });
  for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
    await page.evaluate(type => window.bedAudit.setup(type), type);
    await page.waitForFunction(() => !!window.bedAudit.scene.getObjectByName(`physical_sim_${window.bedAudit.sourceId}`), undefined, { timeout: 90000 });
    await page.evaluate(() => window.bedAudit.advance(20)); await waitMesh();
    const upright = await page.evaluate(() => window.bedAudit.snapshot());
    if (upright.mass_g < 0.499) throw new Error(`Controlled crystal bed did not settle: ${JSON.stringify(upright)}`);
    await page.evaluate(() => window.bedAudit.tilt());
    await page.waitForFunction(() => { const s = window.bedAudit.snapshot(); return s?.slope_rad > 0.9; }, undefined, { timeout: 90000 });
    const inclined = await page.evaluate(() => window.bedAudit.snapshot());
    await page.screenshot({ path: path.join(output, `${type}-before-relaxation.png`) });
    await page.evaluate(() => window.bedAudit.advance(30)); await waitMesh();
    const relaxed = await page.evaluate(() => window.bedAudit.snapshot());
    if (relaxed.material !== inclined.material || Math.abs(relaxed.mass_g - inclined.mass_g) > 1e-9
      || Math.abs(relaxed.population_g - relaxed.actualStock_g) > 1e-9 || relaxed.mobile_g > 1e-9) throw new Error(`Bed matter moved into a false mobile reservoir at ${type}`);
    if (!(relaxed.centerWorld[1] < inclined.centerWorld[1]) || !(relaxed.slope_rad < inclined.slope_rad - 0.05)
      || relaxed.slope_rad < Math.PI / 6 - 1e-7) throw new Error(`Non-downhill bed motion: ${type}`);
    await page.screenshot({ path: path.join(output, `${type}-after-relaxation.png`) });
    delete upright.material; delete inclined.material; delete relaxed.material;
    report.cases.push({ type, upright, inclined, relaxed });
  }
  const before = await page.evaluate(() => JSON.stringify(window.bedAudit.snapshot()));
  await page.evaluate(() => window.bedAudit.quality.getState().setPreference('medium')); await waitMesh();
  report.qualityPreserved = await page.evaluate(old => JSON.stringify(window.bedAudit.snapshot()) === old, before);
  if (!report.qualityPreserved) throw new Error('Paused quality change altered the bed snapshot');
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, qualityPreserved: report.qualityPreserved, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
