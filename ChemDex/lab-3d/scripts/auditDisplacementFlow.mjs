import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.DISPLACEMENT_AUDIT_OUTPUT ?? 'docs/research/displaced-source-flow-2026-10-30');
await mkdir(output, { recursive: true });
const report = { method: 'Real app/controller and uploaded stock matrices. Dense Cu uses actual mesh immersion; independent explicit mouth-cap construction measures immersed rendered volume. CuS retains the declared compact reference. No CFD/rigid-body calibration or FPS claim.', errors: [], consoleErrors: [], cases: [] };
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
  await page.evaluate(async () => { window.displacedRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.displacedRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const { getVesselProfile, getWorldVesselProfile } = await import('/src/pour/physics/profiles.ts');
    const { retainedVolume, volumeBelowPlane } = await import('/src/pour/physics/retained.ts');
    const { calculateWeirFlow } = await import('/src/pour/physics/flow.ts');
    const { calculateVesselWeirFlow } = await import('/src/pour/physics/vesselFlow.ts');
    const { occupiedLiquidVolume } = await import('/src/handling/solidOccupancy.ts');
    const { contourRadius } = await import('/src/science/vesselDimensions.ts');
    const { mobileSolidInventory } = await import('/src/science/suspensionTransport.ts');
    const { geometryVolume } = await import('/src/components/three/stockSolidGeometry.ts');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    const { meshHalfspaceVolume } = await import('/tests/helpers/meshHalfspaceVolume.ts');
    const { clipClosedMesh } = await import('/tests/helpers/clipClosedMesh.ts');
    const THREE = await import('/node_modules/.vite/deps/three.js');
    const root = [...window.displacedRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState();
    const a = { store, PourController, SimulationEngine, sourceId: null, targetId: null };
    a.inventory = () => {
      const s = store.getState(), parts = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
      const grams = {}, moles = {};
      for (const p of parts) for (const c of p.contents) { const key = `${c.formula}:${c.phase}`; grams[key] = (grams[key] ?? 0) + c.mass_g; moles[key] = (moles[key] ?? 0) + c.moles; }
      return { volume_ml: parts.reduce((n, p) => n + p.volume_ml, 0), mass_g: parts.reduce((n, p) => n + p.mass_g, 0), grams, moles };
    };
    a.setup = (type, suspended = false) => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      PourController.getSession(); SimulationEngine.clearAll();
      store.getState().addVessel(type, 'Nguồn có vật rắn'); store.getState().addVessel('beaker', 'Bình nhận');
      const [sourceId, targetId] = Object.keys(store.getState().vessels); a.sourceId = sourceId; a.targetId = targetId;
      const capacity_ml = type === 'flask' ? 250 : type === 'test_tube' ? 50 : 100;
      const solidVolume = capacity_ml * 0.04, mass = suspended ? 1 : solidVolume * 8.96, formula = suspended ? 'CuS' : 'Cu';
      const liquid = suspended ? 80 : retainedVolume(getWorldVesselProfile(type, capacity_ml), 0.5) - solidVolume / 2;
      store.setState(s => ({ vessels: {
        [sourceId]: { ...s.vessels[sourceId], type, capacity_ml, position: [-1.5, 1.6, 0], rotationY: 0.4,
          volume_ml: liquid, volume: liquid / capacity_ml, mass_g: liquid + mass, temperature_c: 25, liquidColor: '#42aecf',
          substances: ['H2O', formula], ...(suspended ? { hasPrecipitate: true, precipitateSubstance: formula } : {}),
          contents: [{ formula: 'H2O', phase: 'l', mass_g: liquid, moles: liquid / computeMolarMass('H2O') },
            { formula, phase: 's', mass_g: mass, moles: mass / computeMolarMass(formula), ...(suspended ? { solidOrigin: 'precipitate' } : {}) }] },
        [targetId]: { ...s.vessels[targetId], capacity_ml: 500, position: [2, -0.135, 0], volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [] } } }));
      PourController.beginPour({ sourceId, targetId, mode: 'HAND_TILT', assist: 'low' });
      const session = PourController.getSession(); session.tilt = 0.5; session.sourceRotationZ = -0.5; session.targetTilt = 0.5;
      a.suspended = suspended; a.requested = suspended ? 0.5 : solidVolume * 0.05;
      return a.inventory();
    };
    a.snapshot = () => {
      const v = store.getState().vessels[a.sourceId], mesh = root.scene.getObjectByName(`liquid_volume_${a.sourceId}`);
      if (!mesh?.visible) return null;
      mesh.updateWorldMatrix(true, false);
      const raw = getVesselProfile(v.type, v.capacity_ml), p = getWorldVesselProfile(v.type, v.capacity_ml);
      const plane = mesh.material.clippingPlanes[0], local = plane.clone().applyMatrix4(mesh.parent.matrixWorld.clone().invert());
      const normal = local.normal.clone().negate(), angle = Math.atan2(Math.hypot(normal.x, normal.z), normal.y);
      const lip = new THREE.Vector3(...raw.lipLocal).applyMatrix4(mesh.parent.matrixWorld);
      const inventoryMobile = mobileSolidInventory(v, SimulationEngine.findManager(v.id));
      const flow = calculateVesselWeirFlow(v, angle, 0, 1, inventoryMobile);
      const plain = calculateWeirFlow(p, v.volume_ml, angle);
      const geometric_ml = volumeBelowPlane(raw, -Math.hypot(normal.x, normal.z), normal.y, local.constant) / raw.referenceSceneVolume * raw.capacity_ml;
      let renderedCuVolume_ml = 0, renderedWetCuVolume_ml = 0, renderedLipWetCuVolume_ml = 0;
      const lipPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(plane.normal, lip);
      const stockLayouts = [];
      const envelopes = [], point = new THREE.Vector3(), bodyInverse = mesh.parent.matrixWorld.clone().invert();
      let maxInteriorViolation = 0, worstVertex = null;
      const copper = root.scene.getObjectByName(`solids_${a.sourceId}`)?.getObjectByName('stock-solid-Cu');
      if (copper) copper.traverse(o => {
        if (!o.isMesh || !o.visible) return;
        o.updateWorldMatrix(true, false); const single = geometryVolume(o.geometry), determinant = Math.abs(o.matrixWorld.determinant());
        if (o.isInstancedMesh) stockLayouts.push({ ...o.userData.stockSolid, count: o.count, matrixVersion: o.instanceMatrix.version });
        const measureWet = (world, surface = plane) => {
          const localPlane = surface.clone().applyMatrix4(world.clone().invert());
          const mouth = new THREE.Plane(new THREE.Vector3(0, -1, 0), raw.baseY + raw.H)
            .applyMatrix4(mesh.parent.matrixWorld).applyMatrix4(world.clone().invert());
          const capped = clipClosedMesh(o.geometry, mouth.normal.clone().negate().toArray(), mouth.constant);
          const volume = meshHalfspaceVolume(capped, localPlane.normal.clone().negate().toArray(), localPlane.constant)
            * Math.abs(world.determinant()) * 3.5 ** 3;
          capped.dispose(); return volume;
        };
        const inspectEnvelope = world => {
          const local = bodyInverse.clone().multiply(world), cx = local.elements[12], cz = local.elements[14];
          let bottom = Infinity, top = -Infinity, radius = 0;
          const vertices = o.geometry.attributes.position;
          for (let i = 0; i < vertices.count; i++) {
            point.fromBufferAttribute(vertices, i).applyMatrix4(local);
            bottom = Math.min(bottom, point.y); top = Math.max(top, point.y);
            radius = Math.max(radius, Math.hypot(point.x - cx, point.z - cz));
            // Float32 may put a floor-contact vertex a few ulps below the
            // floor. Measure that vertical error separately; querying the
            // axis closure below the domain spuriously gives wall radius 0.
            const wall = point.y <= raw.baseY + raw.H ? contourRadius(raw.contour, Math.max(raw.baseY, point.y)) : raw.mouthR;
            const violation = Math.max(raw.baseY - point.y, Math.hypot(point.x, point.z) - wall);
            if (violation > maxInteriorViolation) { maxInteriorViolation = violation; worstVertex = { point: point.toArray(), wall,
              geometryPoint: [vertices.getX(i), vertices.getY(i), vertices.getZ(i)], matrix: local.toArray(), stockParent: o.parent.name, waterParent: mesh.parent.name }; }
          }
          envelopes.push({ x: cx, z: cz, bottom, top, radius });
        };
        if (o.isInstancedMesh) {
          const m = new THREE.Matrix4(); for (let i = 0; i < o.count; i++) {
            o.getMatrixAt(i, m); renderedCuVolume_ml += single * determinant * Math.abs(m.determinant()) * 3.5 ** 3;
            const world = o.matrixWorld.clone().multiply(m);
            renderedWetCuVolume_ml += measureWet(world); renderedLipWetCuVolume_ml += measureWet(world, lipPlane); inspectEnvelope(world);
          }
        } else { renderedCuVolume_ml += single * determinant * 3.5 ** 3; renderedWetCuVolume_ml += measureWet(o.matrixWorld);
          renderedLipWetCuVolume_ml += measureWet(o.matrixWorld, lipPlane); inspectEnvelope(o.matrixWorld); }
      });
      let envelopeOverlaps = 0;
      for (let i = 0; i < envelopes.length; i++) for (let j = i + 1; j < envelopes.length; j++) {
        const a = envelopes[i], b = envelopes[j];
        if (Math.hypot(a.x - b.x, a.z - b.z) < a.radius + b.radius - 1e-6 && a.top > b.bottom + 1e-6 && b.top > a.bottom + 1e-6) envelopeOverlaps++;
      }
      return { type: v.type, capacity_ml: v.capacity_ml, liquid_ml: v.volume_ml, occupied_ml: occupiedLiquidVolume(v), angle,
        geometric_ml, renderedHead_cm: plane.distanceToPoint(lip) * 3.5, flow, plain, inventoryMobile,
        declaredCuVolume_ml: v.contents.filter(c => c.formula === 'Cu').reduce((n, c) => n + c.mass_g / 8.96, 0), renderedCuVolume_ml, renderedWetCuVolume_ml, renderedLipWetCuVolume_ml, stockLayouts,
        maxInteriorViolation, envelopeOverlaps, worstVertex };
    };
    a.seedSuspension = () => {
      SimulationEngine.getManager(a.sourceId).step(store.getState().vessels[a.sourceId], 0.01, { thermalStateAuthoritative: true });
      return mobileSolidInventory(store.getState().vessels[a.sourceId], SimulationEngine.findManager(a.sourceId));
    };
    a.setTilt = angle => {
      const session = PourController.getSession(); session.tilt = angle; session.sourceRotationZ = -angle; session.targetTilt = angle;
    };
    a.checkParticlePlane = () => {
      const v = store.getState().vessels[a.sourceId], mesh = root.scene.getObjectByName(`liquid_volume_${a.sourceId}`);
      mesh.updateWorldMatrix(true, false);
      const manager = SimulationEngine.getManager(v.id);
      manager.step(v, 0.001, { thermalStateAuthoritative: true, bodyMatrixWorld: mesh.parent.matrixWorld.toArray() });
      const particle = manager.surfaceFrameCache.plane;
      const rendered = mesh.material.clippingPlanes[0].clone().applyMatrix4(mesh.parent.matrixWorld.clone().invert());
      return { particle, renderedOffset: rendered.constant,
        offsetError: Math.abs(particle.offset - rendered.constant),
        normalError: Math.max(...particle.normal.map((x, k) => Math.abs(x + rendered.normal.toArray()[k]))) };
    };
    a.pour = async () => {
      const before = a.inventory(), sourceBefore = structuredClone(store.getState().vessels[a.sourceId]);
      const mobileBefore = mobileSolidInventory(sourceBefore, SimulationEngine.findManager(a.sourceId));
      await PourController.commitCurrentPour();
      PourController.beginPour({ sourceId: a.sourceId, targetId: a.targetId, mode: 'ASSIST', requestedVolume_ml: a.requested });
      const session = PourController.getSession(); store.setState({ isSimulationPaused: false });
      for (let i = 0; i < 3600; i++) PourController.tick(1 / 60);
      store.setState({ isSimulationPaused: true });
      return { requested_ml: a.requested, before, after: a.inventory(), sourceBefore,
        sourceAfter: structuredClone(store.getState().vessels[a.sourceId]), targetAfter: structuredClone(store.getState().vessels[a.targetId]),
        mobileBefore, session: structuredClone(session) };
    };
    window.displacementAudit = a;
  });
  for (const type of ['beaker', 'flask', 'test_tube', 'cylinder']) {
    await page.evaluate(type => window.displacementAudit.setup(type), type);
    await page.waitForFunction(() => { const s = window.displacementAudit.snapshot(); return s && Math.abs(s.angle - 0.5) < 1e-8 && Math.abs(s.geometric_ml - s.flow.surfaceVolume_ml) < 1e-7; }, undefined, { timeout: 60000 });
    const head = await page.evaluate(() => window.displacementAudit.snapshot());
    if (head.flow.displacementBasis !== 'stock-mesh-envelope-reference'
      || Math.abs(head.geometric_ml - head.renderedWetCuVolume_ml - head.liquid_ml) > 1e-6) throw new Error(`Actual stock displacement mismatch ${type}: ${JSON.stringify(head)}`);
    const qualityChecks = [];
    if (process.env.SOLID_LAYOUT_AUDIT === 'true') {
      if (Math.abs(head.renderedCuVolume_ml / head.declaredCuVolume_ml - 1) > 1e-6 || head.maxInteriorViolation > 1e-6
        || head.envelopeOverlaps || head.stockLayouts.some(s => s.status === 'unresolved-fit')) throw new Error(`Solid layout invalid ${type}: ${JSON.stringify({ volume: head.renderedCuVolume_ml,
          declared: head.declaredCuVolume_ml, wall: head.maxInteriorViolation, overlaps: head.envelopeOverlaps, stockLayouts: head.stockLayouts, worst: head.worstVertex })}`);
      const initialInventory = await page.evaluate(() => window.displacementAudit.inventory());
      for (const tier of ['low', 'medium', 'high', 'ultra']) {
        await page.evaluate(async tier => {
          const { useQualityStore } = await import('/src/vfx/quality.ts'); useQualityStore.getState().setPreference(tier);
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        }, tier);
        const after = await page.evaluate(() => window.displacementAudit.snapshot());
        const inventory = await page.evaluate(() => window.displacementAudit.inventory());
        qualityChecks.push({ tier, stockLayouts: after.stockLayouts, renderedCuVolume_ml: after.renderedCuVolume_ml });
        if (JSON.stringify(inventory) !== JSON.stringify(initialInventory) || JSON.stringify(after.stockLayouts) !== JSON.stringify(head.stockLayouts)
          || Math.abs(after.renderedCuVolume_ml - head.renderedCuVolume_ml) > 1e-10) throw new Error(`Paused solid upload/quantity changed ${type} ${tier}`);
      }
    }
    const expectedExcess = Math.max(0, head.liquid_ml - head.flow.retainedGrossVolume_ml + head.renderedLipWetCuVolume_ml);
    if (head.plain.flowRate_ml_s !== 0 || Math.abs(expectedExcess - head.flow.excessVolume_ml) > 1e-6
      || Math.abs(Math.max(0, head.renderedHead_cm) - head.flow.head_cm) > 1e-8) throw new Error(`Head mismatch ${type}: ${JSON.stringify(head)}`);
    await page.screenshot({ path: path.join(output, `${type}-displaced-lip.png`) });
    const poses = [];
    for (const angle of [0, 1.2, 2.2]) {
      await page.evaluate(angle => window.displacementAudit.setTilt(angle), angle);
      await page.waitForFunction(angle => {
        const s = window.displacementAudit.snapshot();
        return s && Math.abs(s.angle - angle) < 1e-8 && Math.abs(s.geometric_ml - s.flow.surfaceVolume_ml) < 1e-7;
      }, angle, { timeout: 60000 });
      const pose = await page.evaluate(() => window.displacementAudit.snapshot());
      const particle = await page.evaluate(() => window.displacementAudit.checkParticlePlane());
      if (Math.abs(pose.geometric_ml - pose.renderedWetCuVolume_ml - pose.liquid_ml) > 1e-6
        || Math.abs(Math.max(0, pose.renderedHead_cm) - pose.flow.head_cm) > 1e-8
        || particle.offsetError > 1e-8 || particle.normalError > 1e-8) throw new Error(`Pose/particle mismatch ${type} ${angle}: ${JSON.stringify({pose, particle})}`);
      poses.push({ angle, geometric_ml: pose.geometric_ml, wet_ml: pose.renderedWetCuVolume_ml,
        head_cm: pose.renderedHead_cm, flow: pose.flow, particle });
    }
    const pour = await page.evaluate(() => window.displacementAudit.pour()); report.cases.push({ type, head, qualityChecks, poses, pour });
    if (Math.abs(pour.session.transferred_ml - pour.requested_ml) > 1e-8 || Math.abs(pour.session.spilled_ml) > 1e-8
      || Math.abs(pour.sourceBefore.contents.find(c => c.formula === 'Cu').mass_g - pour.sourceAfter.contents.find(c => c.formula === 'Cu').mass_g) > 1e-10) throw new Error(`Fixed copper transfer mismatch ${type}`);
    for (const field of ['mass_g', 'volume_ml']) if (Math.abs(pour.before[field] - pour.after[field]) > 1e-8) throw new Error(`Inventory ${field} mismatch ${type}`);
    for (const key of Object.keys(pour.before.moles)) if (Math.abs(pour.before.moles[key] - pour.after.moles[key]) > 1e-10) throw new Error(`Moles mismatch ${type} ${key}`);
  }
  await page.evaluate(() => window.displacementAudit.setup('beaker', true));
  await page.waitForFunction(() => window.displacementAudit.snapshot()?.angle > 0.49, undefined, { timeout: 60000 });
  const authorized = await page.evaluate(() => window.displacementAudit.seedSuspension());
  if (!(authorized.CuS?.suspendedMass_g > 0)) throw new Error('Missing suspension authorization');
  const head = await page.evaluate(() => window.displacementAudit.snapshot()), pour = await page.evaluate(() => window.displacementAudit.pour());
  report.suspension = { head, pour };
  const expected = pour.mobileBefore.CuS.suspendedMass_g * pour.requested_ml / pour.sourceBefore.volume_ml;
  const received = pour.targetAfter.contents.filter(c => c.formula === 'CuS').reduce((n, c) => n + c.mass_g, 0);
  if (Math.abs(received - expected) > 1e-9 || Math.abs(pour.session.transferred_ml - pour.requested_ml) > 1e-8) throw new Error('Suspended dose mismatch');
  for (const key of Object.keys(pour.before.moles)) if (Math.abs(pour.before.moles[key] - pour.after.moles[key]) > 1e-10) throw new Error(`Suspension moles mismatch ${key}`);
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, suspension: Boolean(report.suspension), errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
