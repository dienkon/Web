import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.THIN_LIQUID_AUDIT_OUTPUT ?? 'docs/research/thin-liquid-2026-10-30');
await mkdir(output, { recursive: true });
const report = { method: 'Actual app meshes, clipping plane, compiled WebGL wave uniform, controller poses and water inventory. Paused geometric cases are not a capillary experiment or FPS measurement.', errors: [], consoleErrors: [], cases: [], pours: [] };
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
  await page.evaluate(async () => { window.thinRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.thinRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { getVesselProfile } = await import('/src/pour/physics/profiles.ts');
    const { volumeBelowPlane, solveLevel } = await import('/src/pour/physics/retained.ts');
    const { polygonBedVolume } = await import('/src/simulation/effects/polygonBedVolume.ts');
    const { meshHalfspaceVolume } = await import('/tests/helpers/meshHalfspaceVolume.ts');
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const root = [...window.thinRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState();
    const a = { store, PourController, root, getVesselProfile, meshHalfspaceVolume, sourceId: null, targetId: null };
    // Materials can share one WebGLProgram. Read its uniforms immediately
    // after each mesh draw, before another layer overwrites that GL state.
    a.renderedPlanes = mesh => {
      if (!mesh.userData.auditReadInstalled) {
        const previous = mesh.onAfterRender;
        mesh.onAfterRender = function (renderer, ...args) {
          previous.call(this, renderer, ...args);
          const program = renderer.properties.get(this.material).currentProgram, gl = renderer.getContext();
          const uniforms = program?.getUniforms().map;
          if (uniforms?.uBodyPlane && uniforms.uBodyLowerPlane) this.userData.auditGPUPlanes = {
            top: Array.from(gl.getUniform(program.program, uniforms.uBodyPlane.addr)),
            lower: Array.from(gl.getUniform(program.program, uniforms.uBodyLowerPlane.addr)), geometryUUID: this.geometry.uuid };
        };
        mesh.userData.auditReadInstalled = true;
      }
      return mesh.userData.auditGPUPlanes?.geometryUUID === mesh.geometry.uuid ? mesh.userData.auditGPUPlanes : null;
    };
    a.inventory = () => {
      const s = store.getState(), parts = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
      return { volume_ml: parts.reduce((v, p) => v + p.volume_ml, 0), mass_g: parts.reduce((v, p) => v + p.mass_g, 0),
        water_mol: parts.flatMap(p => p.contents).reduce((v, p) => v + (p.formula === 'H2O' ? p.moles : 0), 0) };
    };
    a.setup = (type, volume_ml) => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      PourController.getSession();
      store.getState().addVessel(type, 'Lớp nước mỏng'); store.getState().addVessel('beaker', 'Bình nhận');
      const [id, target] = Object.keys(store.getState().vessels); a.sourceId = id; a.targetId = target;
      const capacity_ml = type === 'flask' ? 250 : type === 'test_tube' ? 50 : 100;
      store.setState(s => ({ vessels: {
        [id]: { ...s.vessels[id], type, position: [-1, -0.135, 0], rotationY: 0.4, capacity_ml, volume_ml, volume: volume_ml / capacity_ml,
          mass_g: volume_ml, temperature_c: 25, liquidColor: '#25b5db', substances: ['H2O'],
          contents: [{ formula: 'H2O', phase: 'l', mass_g: volume_ml, moles: volume_ml / 18.015 }] },
        [target]: { ...s.vessels[target], position: [2, -0.135, 0], capacity_ml: 100, volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] } } }));
      PourController.beginPour({ sourceId: id, targetId: target, mode: 'HAND_TILT', assist: 'low' });
      return a.inventory();
    };
    a.pose = () => {
      PourController.setTilt(1.0); store.setState({ isSimulationPaused: false });
      for (let i = 0; i < 120; i++) { PourController.tick(1 / 60); if ((PourController.getSession()?.tilt ?? 0) >= 0.8) break; }
      store.setState({ isSimulationPaused: true });
      return structuredClone(PourController.getSession());
    };
    a.snapshot = () => {
      const v = store.getState().vessels[a.sourceId], mesh = root.scene.getObjectByName(`liquid_volume_${a.sourceId}`), cap = root.scene.getObjectByName(`liquid_surface_${a.sourceId}`);
      if (!mesh || !cap || !mesh.visible || !cap.visible) return null;
      mesh.updateWorldMatrix(true, false);
      const plane = mesh.material.clippingPlanes[0].clone().applyMatrix4(mesh.parent.matrixWorld.clone().invert());
      const meshPlane = mesh.material.clippingPlanes[0].clone().applyMatrix4(mesh.matrixWorld.clone().invert());
      const normal = plane.normal.clone().negate(), c = plane.constant, meshNormal = meshPlane.normal.clone().negate();
      const p = getVesselProfile(v.type, v.capacity_ml), n = [-Math.hypot(normal.x, normal.z), normal.y, 0];
      const tilt = Math.atan2(-n[0], n[1]), level = solveLevel(p, tilt, v.volume_ml);
      const continuumVolume_ml = volumeBelowPlane(p, n[0], n[1], c) / p.referenceSceneVolume * p.capacity_ml;
      const metadata = mesh.geometry.userData.liquid;
      const uniformFineMeshVolume_ml = polygonBedVolume(p, normal.toArray(), c, metadata.fineSegments) / p.referenceSceneVolume * p.capacity_ml;
      const uploadedMeshVolume_ml = meshHalfspaceVolume(mesh.geometry, meshNormal.toArray(), meshPlane.constant) / p.referenceSceneVolume * p.capacity_ml;
      const bodyProgram = root.gl.properties.get(mesh.material).currentProgram, gl = root.gl.getContext();
      const gpuPlane = a.renderedPlanes(mesh)?.top ?? null;
      const gpuVolume_ml = gpuPlane ? meshHalfspaceVolume(mesh.geometry, gpuPlane.slice(0, 3), gpuPlane[3]) / p.referenceSceneVolume * p.capacity_ml : null;
      const localClippingCompiled = Boolean(bodyProgram && gl.getShaderSource(bodyProgram.fragmentShader).includes('dot(uBodyPlane.xyz, vLiquidModelPosition)'));
      const program = root.gl.properties.get(cap.material).currentProgram;
      const uniform = program?.getUniforms().map.uSurfaceWaveLimit;
      const waveLimit = uniform ? root.gl.getContext().getUniform(program.program, uniform.addr) : null;
      const surfaceNormal = new THREE.Vector3(0, 0, 1).applyQuaternion(cap.quaternion);
      return { type: v.type, stock_ml: v.volume_ml, bodyVisible: mesh.visible, surfaceVisible: cap.visible, tilt, c, radialSegments: mesh.geometry.parameters.segments,
        fineSegments: metadata.fineSegments, originY: metadata.originY, vertices: mesh.geometry.attributes.position.count, triangles: mesh.geometry.index.count / 3,
        continuumVolume_ml, uniformFineMeshVolume_ml, uploadedMeshVolume_ml, gpuPlane, gpuVolume_ml, localClippingCompiled, relativeError: (continuumVolume_ml - v.volume_ml) / v.volume_ml,
        waveLimit, depth: level.depth, surfaceNormalDot: surfaceNormal.dot(normal), worldPlaneNormal: mesh.material.clippingPlanes[0].normal.toArray() };
    };
    window.thinAudit = a;
  });
  for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
    for (const volume of [0.02, 0.0002]) {
      const before = await page.evaluate(([type, volume]) => window.thinAudit.setup(type, volume), [type, volume]);
      await page.waitForFunction(() => { const s = window.thinAudit.snapshot(); return s?.gpuVolume_ml !== null && s?.gpuVolume_ml !== undefined; }, undefined, { timeout: 60000 });
      const upright = await page.evaluate(() => window.thinAudit.snapshot());
      if (!upright.localClippingCompiled || Math.abs(upright.uploadedMeshVolume_ml / volume - 1) > 0.002
        || Math.abs(upright.gpuVolume_ml / volume - 1) > 0.002) throw new Error(`Upright precision failure ${type} ${volume}`);
      const session = await page.evaluate(() => window.thinAudit.pose());
      await page.waitForFunction(() => {
        const s = window.thinAudit.snapshot(); return s && s.tilt > 0.79 && s.waveLimit !== null && Math.abs(s.relativeError) < 1e-6;
      }, undefined, { timeout: 60000 });
      const tilted = await page.evaluate(() => window.thinAudit.snapshot()), after = await page.evaluate(() => window.thinAudit.inventory());
      const row = { type, volume, before, upright, session, tilted, after }; report.cases.push(row);
      if (volume === 0.02) await page.screenshot({ path: path.join(output, `${type}-thin-tilted.png`) });
      if (Math.abs(tilted.relativeError) > 1e-6 || Math.abs(tilted.uploadedMeshVolume_ml / volume - 1) > 0.002
        || !tilted.localClippingCompiled || Math.abs(tilted.gpuVolume_ml / volume - 1) > 0.002
        || tilted.waveLimit > tilted.depth * 0.050001 || tilted.waveLimit <= 0
        || tilted.surfaceNormalDot < 0.999999 || JSON.stringify(before) !== JSON.stringify(after)) throw new Error(`Thin geometry failure ${type} ${volume}`);
      // A paused controller pose isolates the horizontal cap before any
      // discharge step. This is a geometric check, not static equilibrium.
      await page.evaluate(() => {
        const s = window.thinAudit.PourController.getSession(); s.tilt = Math.PI / 2; s.sourceRotationZ = -Math.PI / 2;
      });
      await page.waitForFunction(() => {
        const s = window.thinAudit.snapshot(); return s && Math.abs(s.tilt - Math.PI / 2) < 1e-8 && Math.abs(s.relativeError) < 1e-6;
      }, undefined, { timeout: 60000 });
      row.horizontal = await page.evaluate(() => window.thinAudit.snapshot());
      if (Math.abs(row.horizontal.uploadedMeshVolume_ml / volume - 1) > 0.002 || Math.abs(row.horizontal.gpuVolume_ml / volume - 1) > 0.002) throw new Error(`Horizontal mesh failure ${type} ${volume}`);
    }
    await page.evaluate(type => window.thinAudit.setup(type, 0.02), type);
    const receipt = await page.evaluate(async () => {
      const a = window.thinAudit, before = a.inventory();
      await a.PourController.commitCurrentPour();
      a.PourController.beginPour({ sourceId: a.sourceId, targetId: a.targetId, mode: 'ASSIST', requestedVolume_ml: 0.02 });
      const session = a.PourController.getSession();
      a.store.setState({ isSimulationPaused: false });
      for (let i = 0; i < 900; i++) a.PourController.tick(1 / 60);
      a.store.setState({ isSimulationPaused: true });
      return { type: a.store.getState().vessels[a.sourceId].type, before, after: a.inventory(), session: structuredClone(session), sourceRemaining_ml: a.store.getState().vessels[a.sourceId].volume_ml };
    });
    report.pours.push(receipt);
    if (Math.abs(receipt.session.released_ml - 0.02) > 1e-10 || receipt.sourceRemaining_ml > 1e-10
      || Math.abs(receipt.before.mass_g - receipt.after.mass_g) > 1e-12 || Math.abs(receipt.before.water_mol - receipt.after.water_mol) > 1e-13) throw new Error(`Tiny pour failure ${type}`);
  }
  await page.evaluate(async () => {
    const a = window.thinAudit; a.setup('separatory_funnel', 3.005);
    a.store.setState(s => ({ vessels: { ...s.vessels, [a.sourceId]: { ...s.vessels[a.sourceId], immiscibleOrganicVolume_ml: 0.005,
      immiscibleOrganicColor: '#f5b327', mass_g: 3 + 0.005 * 0.879, substances: ['H2O', 'C6H6'],
      contents: [{ formula: 'H2O', phase: 'l', liquidLayer: 'aqueous', mass_g: 3, moles: 3 / 18.015 },
        { formula: 'C6H6', phase: 'l', liquidLayer: 'organic', mass_g: 0.005 * 0.879, moles: 0.005 * 0.879 / 78.114 }] } } }));
    const session = a.PourController.getSession(); session.tilt = 0.8; session.sourceRotationZ = -0.8;
    a.layerInventory = JSON.stringify(a.store.getState().vessels[a.sourceId]);
    a.layerSnapshot = () => {
      const meshes = []; a.root.scene.traverse(o => { if (o.name === `liquid_volume_${a.sourceId}` && o.visible) meshes.push(o); });
      if (meshes.length !== 2) return null;
      return meshes.map(mesh => {
        const captured = a.renderedPlanes(mesh); if (!captured) return null;
        const { top, lower } = captured;
        const { getVesselProfile } = a;
        const p = getVesselProfile('separatory_funnel', a.store.getState().vessels[a.sourceId].capacity_ml);
        const volume = a.meshHalfspaceVolume(mesh.geometry, top.slice(0, 3), top[3])
          - (lower[0] || lower[1] || lower[2] ? a.meshHalfspaceVolume(mesh.geometry, lower.slice(0, 3), lower[3]) : 0);
        return { volume_ml: volume / p.referenceSceneVolume * p.capacity_ml, top, lower, vertices: mesh.geometry.attributes.position.count };
      });
    };
  });
  await page.waitForFunction(() => { const rows = window.thinAudit.layerSnapshot(); return rows?.every(Boolean); }, undefined, { timeout: 60000 });
  report.layers = [];
  for (const tier of ['low', 'medium', 'high', 'ultra']) {
    await page.evaluate(async tier => {
      const { useQualityStore } = await import('/src/vfx/quality.ts'); useQualityStore.getState().setPreference(tier);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    }, tier);
    const layers = await page.evaluate(() => window.thinAudit.layerSnapshot());
    const unchanged = await page.evaluate(() => window.thinAudit.layerInventory === JSON.stringify(window.thinAudit.store.getState().vessels[window.thinAudit.sourceId]));
    report.layers.push({ tier, unchanged, layers });
    if (!unchanged || layers.length !== 2 || Math.abs(layers[0].volume_ml / 3 - 1) > 0.002 || Math.abs(layers[1].volume_ml / 0.005 - 1) > 0.002) throw new Error(`Layer clipping failure ${tier}: ${JSON.stringify(layers)}`);
  }
  await page.screenshot({ path: path.join(output, 'layered-funnel.png') });
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, pours: report.pours.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
