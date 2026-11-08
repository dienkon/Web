import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.FOAM_ICE_OUTPUT ?? 'artifacts/foam-ice');
await mkdir(output, { recursive: true });
const report = { method: 'Real finite O2 foam specimen, phase solver heat increments and rendered mesh volumes. Hydrate/copper stocks are authored finite inventories. Desktop Chrome with touch viewport emulation, not a phone benchmark.', errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.evaluate(async () => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const { geometryVolume } = await import('/src/components/three/stockSolidGeometry.ts');
      const { solidSceneVolume } = await import('/src/science/vesselDimensions.ts');
      const { liquidSurfaceVolume, waterPhaseMasses } = await import('/src/engine/waterPhase.ts');
      const { applyThermalEnergy } = await import('/src/engine/thermalState.ts');
      const { WATER_FUSION_J_G, ICE_DENSITY_G_ML } = await import('/src/engine/waterProperties.ts');
      const { stepFoamInventory } = await import('/src/engine/foamInventory.ts');
      const { computeMolarMass } = await import('/src/engine/ledger.ts');
      const { getBenchNormalTexture } = await import('/src/vfx/materials/benchNormal.ts');
      app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false });
      const foamId = app.getState().prepareStudioProgram('h2o2_mno2', 'oxygen_foam');
      if (!foamId || !app.getState().runStudioProgram(foamId) || !app.getState().seekStudioProgram(foamId, 0.8)) throw new Error('Finite foam fixture failed');
      const iceId = app.getState().prepareStudioIceSample();
      for (const formula of ['CuSO4·5H2O', 'Cu (turnings)']) {
        app.getState().addVessel('beaker', formula);
        const id = Object.keys(app.getState().vessels).at(-1), mass_g = formula === 'CuSO4·5H2O' ? 5 : 2;
        app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], capacity_ml: 100,
          contents: [{ formula, phase: 's', mass_g, moles: mass_g / computeMolarMass(formula), initialMass_g: mass_g }],
          mass_g, substances: [formula], volume_ml: 0, volume: 0 } } }));
      }
      const ids = Object.keys(app.getState().vessels);
      app.setState(s => ({ selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false,
        vessels: Object.fromEntries(ids.map((id, i) => [id, { ...s.vessels[id], position: innerWidth < 500
          ? [i % 2 ? 1.25 : -1.25, -0.135, i < 2 ? 3 : 0] : [-3.6 + i * 2.4, -0.135, 2] }])) }));
      window.foamIceAudit = { app, foamId, iceId, ids, geometryVolume, solidSceneVolume, waterPhaseMasses, liquidSurfaceVolume,
        applyThermalEnergy, WATER_FUSION_J_G, ICE_DENSITY_G_ML, stepFoamInventory,
        root: () => [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store.getState(),
        rootStore: () => [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store,
        benchNormal: getBenchNormalTexture() };
    });
    await page.waitForFunction(() => {
      const a = window.foamIceAudit, scene = a.root().scene;
      return scene.getObjectByName(`foam_volume_${a.foamId}`) && scene.getObjectByName(`solids_${a.iceId}`)?.getObjectByName('water-ice');
    });
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const a = window.foamIceAudit, root = a.root();
      // Pin the camera fixture after the app's camera transition callback.
      // Simulation, optical clocks and rendering remain on the real pipeline.
      a.pinCamera = (position, target) => {
        a.unpinCamera?.();
        a.unpinCamera = root.internal.subscribe({ current: ({ camera }) => {
          camera.position.set(...position); camera.lookAt(...target); camera.updateMatrixWorld();
        } }, 0, a.rootStore());
      };
      a.normalCamera = [0, innerWidth < 500 ? 5 : 3.2, innerWidth < 500 ? 13 : 10.5];
      a.normalTarget = [0, -0.1, 1.5]; a.pinCamera(a.normalCamera, a.normalTarget);
      a.capture = () => {
        const scene = root.scene, ice = a.app.getState().vessels[a.iceId], foam = a.app.getState().vessels[a.foamId];
        const mesh = scene.getObjectByName(`solids_${a.iceId}`)?.getObjectByName('water-ice');
        const iceMass = a.waterPhaseMasses(ice).ice_g;
        const foamMesh = scene.getObjectByName(`foam_volume_${a.foamId}`);
        const materialVolume = mesh ? a.geometryVolume(mesh.geometry) * mesh.scale.x * mesh.scale.y * mesh.scale.z : 0;
        const expectedVolume = a.solidSceneVolume(ice, iceMass / a.ICE_DENSITY_G_ML);
        const stocks = a.ids.slice(2).map(id => {
          let object; scene.getObjectByName(`solids_${id}`)?.traverse(o => { if (o.name.startsWith(`stock_solid_${id}_`)) object = o; });
          return object ? { type: object.material.type, metalness: object.material.metalness, anisotropy: object.material.anisotropy,
            flatShading: object.material.flatShading, volume: object.userData.stockSolid.materialSceneVolume } : null;
        });
        return { iceMass, materialVolume, expectedVolume, surface_ml: a.liquidSurfaceVolume(ice), icePosition: mesh?.position.toArray(),
          iceFinish: mesh ? { roughness: mesh.material.roughness, clearcoat: mesh.material.clearcoat } : null,
          foam_ml: foam.foam_ml, foamShader: foamMesh?.material.customProgramCacheKey(), stocks,
          waterMass: a.waterPhaseMasses(ice).ice_g + a.waterPhaseMasses(ice).liquid_g,
          foamMass: foam.contents.filter(r => r.location === 'foam').reduce((s, r) => s + r.mass_g, 0),
          inventory: JSON.stringify(a.ids.map(id => a.app.getState().vessels[id].contents)) };
      };
      a.heat = joules => a.app.setState(s => ({ vessels: { ...s.vessels,
        [a.iceId]: { ...s.vessels[a.iceId], ...a.applyThermalEnergy(s.vessels[a.iceId], joules) } } }));
    });
    await page.waitForTimeout(300);
    const initial = await page.evaluate(() => window.foamIceAudit.capture());
    if (!(initial.foam_ml > 0) || Math.abs(initial.materialVolume - initial.expectedVolume) > 1e-7 || initial.stocks.some(s => !s)) throw new Error('Initial geometry/finite fixture failed');
    await page.screenshot({ path: resolve(output, `foam-ice-${viewport.width}.png`) });
    if (viewport.width > 500) {
      await page.evaluate(() => {
        const a = window.foamIceAudit, p = a.app.getState().vessels[a.foamId].position;
        a.pinCamera([p[0], 1.4, p[2] + 3.5], [p[0], -0.25, p[2]]);
      });
      await page.waitForTimeout(250);
      await page.screenshot({ path: resolve(output, 'foam-closeup.png') });
      await page.evaluate(() => {
        const a = window.foamIceAudit; a.pinCamera(a.normalCamera, a.normalTarget);
      });
    }
    await page.waitForTimeout(250);
    const frozen = await page.evaluate(() => window.foamIceAudit.capture());
    if (initial.inventory !== frozen.inventory) throw new Error('Paused inventory changed');
    await page.evaluate(() => { const a = window.foamIceAudit; a.heat(2.5 * a.WATER_FUSION_J_G); });
    await page.waitForTimeout(300);
    const half = await page.evaluate(() => window.foamIceAudit.capture());
    if (Math.abs(half.iceMass - 2.5) > 1e-9 || Math.abs(half.materialVolume / initial.materialVolume - 0.5) > 1e-6
      || Math.abs(half.surface_ml - initial.surface_ml) > 1e-8 || half.waterMass !== 25) throw new Error('Melt volume/level budget failed');
    await page.evaluate(async () => (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium'));
    await page.waitForTimeout(1000);
    const quality = await page.evaluate(() => window.foamIceAudit.capture());
    if (quality.inventory !== half.inventory || Math.abs(quality.materialVolume - half.materialVolume) > 1e-7) throw new Error('Quality changed matter or geometry');
    await page.screenshot({ path: resolve(output, `half-melt-${viewport.width}.png`) });
    await page.evaluate(() => { const a = window.foamIceAudit; a.heat(2.5 * a.WATER_FUSION_J_G + 0.001); });
    await page.waitForTimeout(250);
    const melted = await page.evaluate(() => window.foamIceAudit.capture());
    if (melted.iceMass !== 0 || melted.materialVolume !== 0 || Math.abs(melted.surface_ml - initial.surface_ml) > 1e-8) throw new Error('Consumed ice still rendered');
    await page.evaluate(() => {
      const a = window.foamIceAudit, old = a.app.getState().vessels[a.foamId], patch = a.stepFoamInventory(old, old, 3);
      a.app.setState(s => ({ vessels: { ...s.vessels, [a.foamId]: { ...old, ...patch } } }));
    });
    await page.waitForTimeout(300);
    const drained = await page.evaluate(() => window.foamIceAudit.capture());
    if (!(drained.foamMass < initial.foamMass) || !(drained.foam_ml < initial.foam_ml)) throw new Error('Foam did not drain with finite source');
    await page.evaluate(() => {
      const a = window.foamIceAudit;
      if (a.app.getState().prepareStudioIceSample(a.iceId) !== a.iceId) throw new Error('Ice specimen replacement failed');
      a.app.setState({ selectedVesselId: null });
    });
    await page.waitForTimeout(300);
    const replaced = await page.evaluate(() => window.foamIceAudit.capture());
    if (replaced.iceMass !== 5 || Math.abs(replaced.materialVolume - initial.materialVolume) > 1e-7) throw new Error('Shared ice shape failed after full melt/remount');
    report.cases.push({ viewport, initial, half, quality, melted, drained, replaced, pass: true });
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, consoleErrors: report.consoleErrors }));
