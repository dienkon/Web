import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.LAYERED_STOCK_AUDIT_OUTPUT ?? 'docs/research/layered-stock-2026-10-30');
await mkdir(output, { recursive: true });
const report = { method: 'Real app stock instance buffers and liquid clipping planes, GPU uniforms read after each layer draw. Independent explicit mouth cap and triangle clip. Controlled finite funnelFlow steps update canonical fixtures; no chemistry kinetics, rigid contact or hydraulic calibration claim.', cases: [], errors: [], consoleErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.layeredRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.layeredRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { getVesselProfile } = await import('/src/pour/physics/profiles.ts');
    const { volumeBelowPlane } = await import('/src/pour/physics/retained.ts');
    const { separatedLayers, stepFunnelFlow } = await import('/src/engine/funnelFlow.ts');
    const { geometryVolume } = await import('/src/components/three/stockSolidGeometry.ts');
    const { meshHalfspaceVolume } = await import('/tests/helpers/meshHalfspaceVolume.ts');
    const { clipClosedMesh } = await import('/tests/helpers/clipClosedMesh.ts');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const root = [...window.layeredRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState();
    const a = { store, PourController, root };
    a.setup = heavy => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      PourController.getSession();
      store.getState().addVessel('separatory_funnel', 'Phễu có hai pha và kẽm'); store.getState().addVessel('beaker', 'Bình nhận');
      [a.sourceId, a.targetId] = Object.keys(store.getState().vessels);
      const organic = heavy ? 'CHCl3' : 'C6H6', density = heavy ? 1.49 : 0.879;
      const item = (formula, mass_g, phase) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
      const contents = [item('H2O', 3, 'l'), { ...item(organic, 0.005 * density, 'l'), liquidLayer: 'organic' },
        { ...item('Zn', 7.14, 's'), initialMass_g: 7.14 }];
      store.setState(s => ({ vessels: {
        [a.sourceId]: { ...s.vessels[a.sourceId], position: [-1.2, 0.2, 0], rotationY: 0.4, capacity_ml: 150,
          volume_ml: 3.005, volume: 3.005 / 150, mass_g: contents.reduce((sum, r) => sum + r.mass_g, 0), contents,
          substances: ['H2O', organic, 'Zn'], immiscibleOrganicVolume_ml: 0.005, immiscibleOrganicColor: '#f3b328',
          liquidColor: '#28b5db', temperature_c: 25, stopcockOpen: false },
        [a.targetId]: { ...s.vessels[a.targetId], capacity_ml: 500, position: [2, -0.135, 0], volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] } } }));
      PourController.beginPour({ sourceId: a.sourceId, targetId: a.targetId, mode: 'HAND_TILT', assist: 'low' });
      const session = PourController.getSession(); session.sourcePos = [-1.2, 0.2, 0]; a.setTilt(0);
    };
    a.setTilt = angle => { const s = PourController.getSession(); s.tilt = angle; s.sourceRotationZ = -angle; s.targetTilt = angle; };
    a.inventory = () => structuredClone(Object.values(store.getState().vessels));
    a.seal = sealed => store.setState(s => ({ vessels: { ...s.vessels, [a.sourceId]: { ...s.vessels[a.sourceId], isSealed: sealed } } }));
    a.stream = () => { const mesh = root.scene.getObjectByName(`funnel_stream_${a.sourceId}`); return mesh ? { color: mesh.material.color.getHexString() } : null; };
    a.capture = mesh => {
      if (!mesh.userData.layeredCaptureInstalled) {
        const previous = mesh.onAfterRender;
        mesh.onAfterRender = function(renderer, ...args) {
          previous.call(this, renderer, ...args);
          const program = renderer.properties.get(this.material).currentProgram, gl = renderer.getContext(), uniforms = program?.getUniforms().map;
          if (uniforms?.uBodyPlane && uniforms.uBodyLowerPlane) this.userData.layeredCapture = {
            top: Array.from(gl.getUniform(program.program, uniforms.uBodyPlane.addr)),
            lower: Array.from(gl.getUniform(program.program, uniforms.uBodyLowerPlane.addr)), uuid: this.geometry.uuid };
        };
        mesh.userData.layeredCaptureInstalled = true;
      }
      return mesh.userData.layeredCapture?.uuid === mesh.geometry.uuid ? mesh.userData.layeredCapture : null;
    };
    a.snapshot = () => {
      const vessel = store.getState().vessels[a.sourceId], expected = separatedLayers(vessel), profile = getVesselProfile(vessel.type, vessel.capacity_ml);
      const meshes = []; root.scene.traverse(o => { if (o.name === `liquid_volume_${a.sourceId}` && o.visible) meshes.push(o); });
      if (meshes.length !== (vessel.volume_ml > 0 ? expected.upperVolume_ml > 0 ? 2 : 1 : 0)) return null;
      const stock = root.scene.getObjectByName(`stock_solid_${a.sourceId}_Zn`);
      if (!stock?.userData.stockSolid || !stock.visible || stock.userData.stockSolid.status === 'unresolved-fit') return null;
      stock.updateWorldMatrix(true, false);
      const matrix = new THREE.Matrix4(), transforms = [];
      for (let i = 0; i < stock.count; i++) { stock.getMatrixAt(i, matrix); transforms.push(stock.matrixWorld.clone().multiply(matrix)); }
      const stockVolume_ml = transforms.reduce((s, m) => s + geometryVolume(stock.geometry) * Math.abs(m.determinant()) * 3.5 ** 3, 0);
      const layers = [];
      for (const mesh of meshes) {
        const gpu = a.capture(mesh); if (!gpu) return null;
        mesh.updateWorldMatrix(true, false); const body = mesh.parent.matrixWorld, inverseBody = body.clone().invert();
        const top = mesh.material.clippingPlanes[0];
        const lower = Math.hypot(...gpu.lower.slice(0, 3)) > 0 ? mesh.material.clippingPlanes[1] : undefined;
        const localTop = top.clone().applyMatrix4(inverseBody), up = localTop.normal.clone().negate();
        const localLower = lower?.clone().applyMatrix4(inverseBody);
        const geometric = c => volumeBelowPlane(profile, -Math.hypot(up.x, up.z), up.y, c) / profile.referenceSceneVolume * vessel.capacity_ml;
        const gross_ml = geometric(localTop.constant) - (localLower ? geometric(-localLower.constant) : 0);
        const mouth = new THREE.Plane(new THREE.Vector3(0, -1, 0), profile.baseY + profile.H).applyMatrix4(body);
        const displaced = surface => transforms.reduce((s, world) => {
          const inverse = world.clone().invert(), cap = mouth.clone().applyMatrix4(inverse), cut = surface.clone().applyMatrix4(inverse);
          const g = clipClosedMesh(stock.geometry, cap.normal.clone().negate().toArray(), cap.constant);
          const amount = meshHalfspaceVolume(g, cut.normal.clone().negate().toArray(), cut.constant) * Math.abs(world.determinant()) * 3.5 ** 3;
          g.dispose(); return s + amount;
        }, 0);
        const displaced_ml = displaced(top) - (lower ? displaced(lower.clone().negate()) : 0);
        const gpuGross_ml = (meshHalfspaceVolume(mesh.geometry, gpu.top.slice(0, 3), gpu.top[3])
          - (Math.hypot(...gpu.lower.slice(0, 3)) > 0 ? meshHalfspaceVolume(mesh.geometry, gpu.lower.slice(0, 3), gpu.lower[3]) : 0))
          / profile.referenceSceneVolume * vessel.capacity_ml;
        layers.push({ upper: !!lower, expected_ml: lower ? expected.upperVolume_ml : expected.lowerVolume_ml,
          geometric_ml: gross_ml, displaced_ml, liquid_ml: gross_ml - displaced_ml,
          gpuGeometric_ml: gpuGross_ml, gpuLiquid_ml: gpuGross_ml - displaced_ml,
          top: localTop.constant, bottom: localLower ? -localLower.constant : null,
          angle: Math.atan2(Math.hypot(up.x, up.z), up.y), gpu });
      }
      layers.sort((a, b) => Number(a.upper) - Number(b.upper));
      return { expected, layers, stockVolume_ml, stock: { ...stock.userData.stockSolid, matrixVersion: stock.instanceMatrix.version } };
    };
    a.shrink = () => store.setState(s => {
      const v = s.vessels[a.sourceId], contents = v.contents.map(r => r.formula === 'Zn' ? { ...r, mass_g: 2.856, moles: 2.856 / computeMolarMass('Zn') } : r);
      return { vessels: { ...s.vessels, [a.sourceId]: { ...v, contents, mass_g: contents.reduce((sum, r) => sum + r.mass_g, 0) } } };
    });
    a.drain = () => {
      const before = a.inventory(), state = store.getState();
      const result = stepFunnelFlow({ ...state.vessels[a.sourceId], stopcockOpen: true }, state.vessels[a.targetId], 1000);
      store.setState({ vessels: { ...state.vessels, [a.sourceId]: result.source, [a.targetId]: result.receiver } });
      return { before, after: a.inventory(), moved_ml: result.moved_ml, spill: result.spill };
    };
    window.layeredStockAudit = a;
  });
  const validate = (snapshot, amount = 1) => {
    if (Math.abs(snapshot.stockVolume_ml - amount) > 1e-6) throw new Error(`Stock volume ${JSON.stringify(snapshot)}`);
    for (const row of snapshot.layers) {
      if (Math.abs(row.liquid_ml - row.expected_ml) > 1e-6 || Math.abs(row.gpuLiquid_ml - row.expected_ml) > Math.max(2e-6, row.expected_ml * 0.005))
        throw new Error(`Layer volume ${JSON.stringify(row)}`);
    }
    if (snapshot.layers.length === 2 && Math.abs(snapshot.layers[0].top - snapshot.layers[1].bottom) > 1e-10) throw new Error('Layer interface gap');
  };
  for (const heavy of [false, true]) {
    await page.evaluate(heavy => window.layeredStockAudit.setup(heavy), heavy);
    const samples = [];
    for (const angle of [0, 0.8, 1.2]) {
      await page.evaluate(angle => window.layeredStockAudit.setTilt(angle), angle);
      await page.waitForFunction(angle => { const s = window.layeredStockAudit.snapshot(); return s?.layers.length === 2 && s.layers.every(r => Math.abs(r.angle - angle) < 1e-8); }, angle, { timeout: 60000 });
      const inventory = await page.evaluate(() => window.layeredStockAudit.inventory());
      for (const tier of ['low', 'medium', 'high', 'ultra']) {
        await page.evaluate(async tier => { const { useQualityStore } = await import('/src/vfx/quality.ts'); useQualityStore.getState().setPreference(tier); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, tier);
        const snapshot = await page.evaluate(() => window.layeredStockAudit.snapshot()); validate(snapshot);
        if (JSON.stringify(inventory) !== JSON.stringify(await page.evaluate(() => window.layeredStockAudit.inventory()))) throw new Error('Quality changed inventory');
        samples.push({ angle, tier, snapshot });
      }
      if (angle === 0) await page.screenshot({ path: path.join(output, `${heavy ? 'heavy' : 'light'}-organic-upright.png`) });
    }
    await page.screenshot({ path: path.join(output, `${heavy ? 'heavy' : 'light'}-organic.png`) });
    await page.evaluate(() => window.layeredStockAudit.shrink());
    await page.waitForFunction(() => { const s = window.layeredStockAudit.snapshot(); return s && Math.abs(s.stockVolume_ml - 0.4) < 1e-6; }, undefined, { timeout: 60000 });
    const shrinking = await page.evaluate(() => window.layeredStockAudit.snapshot()); validate(shrinking, 0.4);
    // Inventory-only drainage is tested upright. Tilted outlet wetting and
    // the finite jet trajectory are separate, still-unresolved flow physics.
    await page.evaluate(() => window.layeredStockAudit.setTilt(0));
    await page.waitForFunction(() => window.layeredStockAudit.snapshot()?.layers.every(r => Math.abs(r.angle) < 1e-8), undefined, { timeout: 60000 });
    const drains = [];
    for (let i = 0; i < 2; i++) {
      const receipt = await page.evaluate(() => window.layeredStockAudit.drain());
      await page.waitForFunction(() => !!window.layeredStockAudit.snapshot(), undefined, { timeout: 60000 });
      const snapshot = await page.evaluate(() => window.layeredStockAudit.snapshot()); validate(snapshot, 0.4);
      if (receipt.spill) throw new Error('Unexpected spill');
      for (const field of ['mass_g', 'volume_ml']) if (Math.abs(receipt.before.reduce((s, v) => s + v[field], 0) - receipt.after.reduce((s, v) => s + v[field], 0)) > 1e-10) throw new Error(`Drain ${field}`);
      const formulas = new Set(receipt.before.flatMap(v => v.contents.map(r => r.formula)));
      for (const formula of formulas) {
        const sum = values => values.flatMap(v => v.contents).filter(r => r.formula === formula).reduce((s, r) => s + r.moles, 0);
        if (Math.abs(sum(receipt.before) - sum(receipt.after)) > 1e-12) throw new Error(`Drain moles ${formula}`);
      }
      const legacyStreamAbsent = !await page.evaluate(() => window.layeredStockAudit.stream());
      if (!legacyStreamAbsent) throw new Error('Legacy unmetered beam still present');
      drains.push({ receipt, snapshot, legacyStreamAbsent });
    }
    report.cases.push({ heavy, samples, shrinking, drains });
  }
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
