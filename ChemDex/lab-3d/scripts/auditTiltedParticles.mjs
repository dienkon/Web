import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(process.env.TILTED_PARTICLE_AUDIT_OUTPUT ?? 'docs/research/tilted-particles-2026-10-29');
await mkdir(output, { recursive: true });
const report = { method: 'Real app/pour controller and rendered matrices. Controlled CuS population; optical bubble/mist seeds verify transforms, not a new chemical or heat source. Paused manual controller and population steps isolate geometry. No FPS claim.',
  errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.particleRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.particleRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { liquidParticlePlane, projectToLiquidPlane } = await import('/src/simulation/effects/liquidParticleFrame.ts');
    const { getVesselProfile } = await import('/src/pour/physics/profiles.ts');
    const { liquidSurfaceVolume } = await import('/src/engine/waterPhase.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const scene = [...window.particleRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState().scene;
    const audit = { store, scene, SimulationEngine, PourController, THREE, useQualityStore };
    const body = () => scene.getObjectByName(`vessel_si_body_${audit.sourceId}`);
    const manager = () => SimulationEngine.getManager(audit.sourceId);
    const physicalState = () => JSON.stringify({ particles: manager().precipitationSystem.particles,
      bubbles: manager().boilingSystem.bubbles, mist: manager().evaporationSystem.particles });
    const inventory = () => {
      const s = store.getState(), parts = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
      return { mass_g: parts.reduce((sum, p) => sum + p.mass_g, 0), water_mol: parts.reduce((sum, p) => sum + p.contents.filter(c => c.formula === 'H2O').reduce((n, c) => n + c.moles, 0), 0),
        CuS_g: parts.reduce((sum, p) => sum + p.contents.filter(c => c.formula === 'CuS').reduce((n, c) => n + c.mass_g, 0), 0) };
    };
    const setup = type => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, pipetteSample: null, inFlightPours: [], spills: {}, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      PourController.getSession(); SimulationEngine.clearAll();
      store.getState().addVessel(type, 'Nguồn có kết tủa'); store.getState().addVessel('beaker', 'Bình nhận');
      const [sourceId, targetId] = Object.keys(store.getState().vessels);
      audit.sourceId = sourceId; audit.targetId = targetId;
      const capacity = type === 'test_tube' ? 50 : type === 'flask' ? 250 : 100;
      const water = capacity * 0.6;
      store.setState(s => ({ vessels: { [sourceId]: { ...s.vessels[sourceId], type, capacity_ml: capacity,
        position: [-2.5, -0.135, 0], rotationY: 0.7, volume_ml: water, volume: 0.6, mass_g: water + 0.1,
        contents: [{ formula: 'H2O', phase: 'l', mass_g: water, moles: water / 18.015 }, { formula: 'CuS', phase: 's', mass_g: 0.1, moles: 0.1 / 95.61 }],
        substances: ['H2O', 'CuS'], temperature_c: 25, hasPrecipitate: true, precipitateSubstance: 'CuS', liquidColor: '#d9f0f6' },
        [targetId]: { ...s.vessels[targetId], capacity_ml: 500, volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [], position: [2, -0.135, 0] } } }));
      return inventory();
    };
    const stepPhysical = (dt = 0.1) => {
      body().updateWorldMatrix(true, false);
      manager().step(store.getState().vessels[audit.sourceId], dt, { thermalStateAuthoritative: true, bodyMatrixWorld: body().matrixWorld.toArray(), agitation: 0 });
    };
    const seedOptical = () => {
      const v = store.getState().vessels[audit.sourceId], b = body(); b.updateWorldMatrix(true, false);
      const matrix = b.matrixWorld.clone(), profile = getVesselProfile(v.type, v.capacity_ml);
      const normal = new THREE.Vector3(0, 1, 0).transformDirection(matrix.clone().invert()).toArray();
      const plane = liquidParticlePlane(profile, liquidSurfaceVolume(v), normal);
      const point = projectToLiquidPlane({ x: 0, y: 0, z: 0 }, 0, plane, 0.15);
      manager().boilingSystem.bubbles = [{ id: 10001, ...point, vx: 0, vy: 0, vz: 0, radius: 0.025, baseRadius: 0.025,
        gasPV_scene3_Pa: 101325 * 0.025 ** 3, nucleationPressure_Pa: 101325, source: 'reaction',
        buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0, aspectRatio: 1,
        life: 0, maxLife: 5, opacity: 1, temperature: 25, isPopping: false, popProgress: 0, merged: false }];
      manager().evaporationSystem.update(0.25, { temp_c: 100, radius: profile.mouthR, mouthRadius: profile.mouthR,
        surfaceY: profile.baseY, mouthY: profile.baseY + profile.H, surfaceArea_cm2: 20, isBoiling: true,
        actualRate_g_s: 0.15, ambient_c: 20, relativeHumidity: 0.5, sourceWaterPressure_Pa: 101325,
        sourceToWorld: point => new THREE.Vector3(...point).applyMatrix4(matrix).toArray() });
    };
    const tilt = () => {
      PourController.beginPour({ mode: 'HAND_TILT', sourceId: audit.sourceId, targetId: audit.targetId, assist: 'low' });
      PourController.setTilt(1.15);
      store.setState({ isSimulationPaused: false });
      for (let i = 0; i < 80; i++) {
        PourController.tick(1 / 60, undefined, false, 1);
        if ((PourController.getSession()?.tilt ?? 0) > 0.95) break;
      }
      store.setState({ isSimulationPaused: true });
      return structuredClone(PourController.getSession());
    };
    const snapshot = () => {
      const id = audit.sourceId, b = body(), group = scene.getObjectByName(`physical_sim_${id}`), liquid = scene.getObjectByName(`liquid_volume_${id}`);
      if (!b || !group || !liquid) return null;
      b.updateWorldMatrix(true, false); group.updateWorldMatrix(true, true);
      const camera = [...window.particleRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState().camera;
      const frameError = Math.max(...b.matrixWorld.elements.map((n, i) => Math.abs(n - group.matrixWorld.elements[i])));
      const system = manager().precipitationSystem, solids = scene.getObjectByName(`physical_precipitate_${id}_CuS`);
      const bubbleMesh = scene.getObjectByName(`physical_bubbles_${id}`), mist = scene.getObjectByName(`physical_mist_${id}`);
      const solidCount = solids?.visible ? solids.count : 0, bubbleCount = bubbleMesh?.visible ? bubbleMesh.count : 0,
        mistCount = mist?.visible ? mist.count : 0;
      const m = new THREE.Matrix4(), center = new THREE.Vector3();
      let solidPositionError = 0, minimumDepth = Infinity;
      if (solids) for (let i = 0; i < solidCount; i++) {
        solids.getMatrixAt(i, m); center.setFromMatrixPosition(m).applyMatrix4(solids.matrixWorld);
        const p = system.particles[i]; if (!p) return null;
        const expected = new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(b.matrixWorld);
        solidPositionError = Math.max(solidPositionError, center.distanceTo(expected));
        minimumDepth = Math.min(minimumDepth, liquid.material.clippingPlanes[0].distanceToPoint(center));
      }
      let mistPositionError = 0;
      if (mist) for (let i = 0; i < mistCount; i++) {
        mist.getMatrixAt(i, m); center.setFromMatrixPosition(m).applyMatrix4(mist.matrixWorld);
        const p = manager().evaporationSystem.particles[i]; if (!p) return null;
        mistPositionError = Math.max(mistPositionError, center.distanceTo(new THREE.Vector3(p.x, p.y, p.z)));
      }
      let billboardDot = null;
      if (bubbleCount && manager().boilingSystem.bubbles.length) {
        bubbleMesh.getMatrixAt(0, m); m.premultiply(bubbleMesh.matrixWorld);
        const actual = new THREE.Vector3(0, 0, 1).transformDirection(m);
        billboardDot = actual.dot(new THREE.Vector3(0, 0, 1).applyQuaternion(camera.quaternion));
      }
      const stock = store.getState().vessels[id].contents.filter(c => c.formula === 'CuS').reduce((n, c) => n + c.mass_g, 0);
      return { frameError, solidPositionError, minimumDepth, mistPositionError, billboardDot,
        solidCount, bubbleCount, mistCount,
        population_g: system.representedMass_g, stock_g: stock, pose: b.matrixWorld.toArray(), physicalState: physicalState(), inventory: inventory() };
    };
    Object.assign(audit, { setup, stepPhysical, seedOptical, tilt, snapshot, physicalState }); window.tiltedAudit = audit;
  });
  for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
    const initial = await page.evaluate(type => window.tiltedAudit.setup(type), type);
    await page.waitForFunction(() => !!window.tiltedAudit.scene.getObjectByName(`physical_sim_${window.tiltedAudit.sourceId}`), undefined, { timeout: 90000 });
    const session = await page.evaluate(() => window.tiltedAudit.tilt());
    if (!session || session.tilt < 0.9) throw new Error(`No real tilt reached for ${type}`);
    await page.waitForFunction(() => {
      const a = window.tiltedAudit, b = a.scene.getObjectByName(`vessel_si_body_${a.sourceId}`), s = a.PourController.getSession();
      return b && s && Math.abs(b.parent.rotation.z - s.sourceRotationZ) < 1e-9 && a.snapshot()?.frameError < 1e-9;
    }, undefined, { timeout: 90000 });
    await page.evaluate(() => { window.tiltedAudit.stepPhysical(0.3); window.tiltedAudit.seedOptical(); });
    await page.waitForFunction(() => {
      const s = window.tiltedAudit.snapshot(); return s?.solidCount > 0 && s.mistCount > 0 && s.bubbleCount > 0
        && s.solidPositionError < 2e-5 && s.mistPositionError < 2e-5 && s.billboardDot > 0.999999;
    }, undefined, { timeout: 90000 });
    const tilted = await page.evaluate(() => window.tiltedAudit.snapshot());
    if (tilted.minimumDepth < -2e-5 || Math.abs(tilted.population_g - tilted.stock_g) > 1e-9) throw new Error(`Escaped particle/mass at ${type}: ${JSON.stringify(tilted)}`);
    await page.screenshot({ path: path.join(output, `${type}-tilted.png`) });
    await page.evaluate(() => {
      const a = window.tiltedAudit; a.store.getState().updateVesselPosition(a.targetId, [4, -0.135, 1.5]);
      a.store.setState({ isSimulationPaused: false }); a.PourController.tick(1 / 60, undefined, false, 1); a.store.setState({ isSimulationPaused: true });
    });
    await page.waitForFunction(oldPose => {
      const s = window.tiltedAudit.snapshot(); return s && s.frameError < 1e-9 && Math.abs(s.pose[12] - oldPose[12]) > 1
        && s.mistPositionError < 2e-5;
    }, tilted.pose, { timeout: 90000 });
    const moved = await page.evaluate(() => window.tiltedAudit.snapshot());
    if (moved.physicalState !== tilted.physicalState) throw new Error('Paused physical state advanced while moving the source');
    for (const key of ['mass_g', 'water_mol', 'CuS_g']) if (Math.abs(moved.inventory[key] - initial[key]) > 1e-8) throw new Error(`Inventory changed at ${type}/${key}`);
    report.cases.push({ type, session, initial, tilted, moved });
  }
  // Remount a different quality tier while the current physical state is paused.
  const before = await page.evaluate(() => window.tiltedAudit.physicalState());
  await page.evaluate(() => window.tiltedAudit.useQualityStore.getState().setPreference('medium'));
  await page.waitForFunction(() => { const s = window.tiltedAudit.snapshot(); return s?.solidCount > 0 && s.frameError < 1e-9 && s.solidPositionError < 2e-5; }, undefined, { timeout: 90000 });
  report.afterQuality = await page.evaluate(() => window.tiltedAudit.snapshot());
  if (report.afterQuality.physicalState !== before) throw new Error('Quality remount changed paused particle history');
  await page.evaluate(() => {
    const a = window.tiltedAudit; a.setup('beaker');
    if (!a.store.getState().prepareStudioProgram('cu_hno3_conc', undefined, a.sourceId)) throw new Error('NO2 specimen preparation failed');
    if (!a.store.getState().runStudioProgram(a.sourceId)) throw new Error('NO2 specimen activation failed');
    a.store.setState({ isSimulationPaused: false });
    a.gasSnapshot = () => {
      const v = a.store.getState().vessels[a.sourceId], mesh = a.scene.getObjectByName('gas_clouds_NO2');
      if (!mesh?.visible || mesh.count < 2) return null;
      mesh.updateWorldMatrix(true, false);
      const identity = new a.THREE.Matrix4(), m = new a.THREE.Matrix4(), p = new a.THREE.Vector3(), centers = [];
      for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); centers.push(p.setFromMatrixPosition(m).applyMatrix4(mesh.matrixWorld).toArray()); }
      return { count: mesh.count, centers, worldMatrixError: Math.max(...mesh.matrixWorld.elements.map((x, i) => Math.abs(x - identity.elements[i]))),
        escapedNO2_g: v.escapedGas_g?.NO2 ?? 0, flux: v.gasFlux,
        matter: JSON.stringify({ contents: v.contents, mass_g: v.mass_g, escaped: v.escapedGas_g, evaporated: v.evaporated_ml }) };
    };
  });
  await page.waitForFunction(() => window.tiltedAudit.gasSnapshot()?.count >= 2, undefined, { timeout: 90000 }).catch(async e => {
    report.gasDebug = await page.evaluate(() => { const a = window.tiltedAudit, s = a.store.getState(), v = s.vessels[a.sourceId];
      return { paused: s.isSimulationPaused, gasFlux: v.gasFlux, escaped: v.escapedGas_g, progress: s.activeKinetics[a.sourceId]?.progress, snapshot: a.gasSnapshot() }; });
    throw e;
  });
  await page.evaluate(() => window.tiltedAudit.store.setState({ isSimulationPaused: true }));
  const gasBefore = await page.evaluate(() => window.tiltedAudit.gasSnapshot());
  if (!(gasBefore.escapedNO2_g > 0)) throw new Error('NO2 plume has no measured chemical exhaust');
  await page.evaluate(() => { const a = window.tiltedAudit; a.store.getState().updateVesselPosition(a.sourceId, [-4.5, -0.135, 1]); });
  await page.waitForFunction(() => {
    const a = window.tiltedAudit, body = a.scene.getObjectByName(`vessel_si_body_${a.sourceId}`); body?.updateWorldMatrix(true, false);
    return body && Math.abs(body.matrixWorld.elements[12] + 4.5) < 1e-9 && a.gasSnapshot()?.worldMatrixError < 1e-9;
  }, undefined, { timeout: 90000 });
  const gasAfter = await page.evaluate(() => window.tiltedAudit.gasSnapshot());
  if (gasAfter.matter !== gasBefore.matter || gasAfter.count !== gasBefore.count
    || gasAfter.centers.some((p, i) => p.some((x, j) => Math.abs(x - gasBefore.centers[i][j]) > 1e-8))) throw new Error('Paused exhaust followed its moved source');
  delete gasBefore.matter; delete gasAfter.matter;
  report.coloredGas = { program: 'cu_hno3_conc', before: gasBefore, after: gasAfter };
  await page.screenshot({ path: path.join(output, 'no2-world-plume.png') });
  for (const row of report.cases) { delete row.tilted.physicalState; delete row.moved.physicalState; }
  delete report.afterQuality.physicalState;
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
