import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.STATE_APPEARANCE_OUTPUT ?? 'artifacts/state-appearance');
await mkdir(output, { recursive: true });
const report = { method: 'Controlled authored inventories and retained optical packets in the real app. No claim of a reaction route or experimental calibration.', errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    await page.evaluate(async () => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const THREE = await import('/node_modules/.vite/deps/three.js');
      const { computeMolarMass } = await import('/src/engine/ledger.ts');
      app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null });
      SimulationEngine.clearAll();
      const formulas = ['CuSO4', 'Cu(OH)2', 'Fe(OH)3', 'PbI2'];
      for (let i = 0; i < formulas.length; i++) {
        app.getState().addVessel('beaker', formulas[i]);
        const id = Object.keys(app.getState().vessels).at(-1), formula = formulas[i];
        const mass_g = i === 0 ? 0.9 : 0.6;
        const contents = [{ formula: 'H2O', phase: 'l', mass_g: 60, moles: 60 / computeMolarMass('H2O') },
          { formula, phase: i === 0 ? 'aq' : 's', mass_g, moles: mass_g / computeMolarMass(formula), ...(i === 3 ? { formation: 'CRYSTAL_PLATE' } : {}) }];
        app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], name: formula, contents,
          capacity_ml: 100, volume_ml: 60, volume: 0.6, mass_g: 60 + mass_g,
          position: innerWidth < 500 ? [i % 2 ? 1.15 : -1.15, -0.135, i < 2 ? 2.5 : 0]
            : [-3.3 + i * 2.2, -0.135, 2], liquidColor: i === 0 ? '#38bdf8' : '#f8fafc',
          hasPrecipitate: i > 0, precipitateSubstance: i ? formula : undefined,
          precipitateMorphology: i === 3 ? 'CRYSTAL_PLATE' : undefined,
          precipitateAmount_g: i ? mass_g : 0, substances: ['H2O', formula], temperature_c: 25 } } }));
      }
      app.setState({ selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false });
      window.appearanceAudit = { app, SimulationEngine, THREE, root: () => [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store.getState() };
    });
    await page.waitForFunction(() => Object.keys(window.appearanceAudit.app.getState().vessels).slice(1).every(id => window.appearanceAudit.root().scene.getObjectByName(`physical_sim_${id}`)));
    await page.waitForTimeout(1500);
    await page.evaluate(() => {
      const a = window.appearanceAudit, root = a.root();
      root.camera.position.set(0, innerWidth < 500 ? 5 : 3.2, innerWidth < 500 ? 12.5 : 10);
      root.controls.target.set(0, -0.1, 1.5); root.controls.update();
      for (const [id, vessel] of Object.entries(a.app.getState().vessels)) {
        const manager = a.SimulationEngine.findManager(id); if (!manager) continue;
        const body = root.scene.getObjectByName(`vessel_si_body_${id}`); body.updateWorldMatrix(true, false);
        manager.step(vessel, 0.25, { thermalStateAuthoritative: true, bodyMatrixWorld: body.matrixWorld.elements, agitation: 0 });
        manager.boilingSystem.bubbles = [0.88, 0.44, 0].map((opacity, i) => ({ id: 10000 + i, x: -0.25 + i * 0.25, y: -0.1, z: 0.15,
          radius: 0.055, baseRadius: 0.055, aspectRatio: 1, opacity, life: 0.1, maxLife: 5, isPopping: true, popProgress: i / 2,
          vx: 0, vy: 0, vz: 0, buoyancy: 1, growthRate: 0, wobblePhase: 0, wobbleSpeed: 0, wobbleAmp: 0,
          temperature: 25, merged: false }));
        manager.evaporationSystem.particles = [{ id: 20000, x: vessel.position[0], y: 1.3, z: 0, vx: 0, vy: 0, vz: 0,
          size: 0.15, baseSize: 0.1, age: 0.5, life: 2, opacity: 0.3, curlSeed: 7 }];
      }
      a.snapshot = () => JSON.stringify({ vessels: a.app.getState().vessels, populations: [...a.SimulationEngine.managers.values()].map(m => ({
        precipitation: m.precipitationSystem.particles, bubbles: m.boilingSystem.bubbles, mist: m.evaporationSystem.particles })) });
      a.before = a.snapshot();
    });
    await page.waitForFunction(() => {
      const a = window.appearanceAudit;
      return Object.keys(a.app.getState().vessels).slice(1).every(id => a.root().scene.getObjectByName(`physical_bubbles_${id}`)?.geometry.getAttribute('aParticleOpacity').getX(1) > 0.4);
    });
    const inspect = () => page.evaluate(() => {
      const a = window.appearanceAudit, result = [];
      for (const [id, v] of Object.entries(a.app.getState().vessels)) {
        const manager = a.SimulationEngine.findManager(id); if (!manager) continue;
        const scene = a.root().scene, bubbles = scene.getObjectByName(`physical_bubbles_${id}`),
          solid = scene.getObjectByName(`physical_precipitate_${id}_${v.precipitateSubstance}`), mist = scene.getObjectByName(`physical_mist_${id}`),
          surface = scene.getObjectByName(`liquid_surface_${id}`);
        const matrix = new a.THREE.Matrix4(), position = new a.THREE.Vector3(), q = new a.THREE.Quaternion(), scale = new a.THREE.Vector3();
        let radiusError = 0;
        if (solid) for (let i = 0; i < solid.count; i++) {
          solid.getMatrixAt(i, matrix); matrix.decompose(position, q, scale);
          radiusError = Math.max(radiusError, Math.abs(scale.x - manager.precipitationSystem.particles[i].radius));
        }
        result.push({ formula: v.precipitateSubstance, solidCount: solid?.count, radiusError,
          bubbleOpacity: Array.from(bubbles.geometry.getAttribute('aParticleOpacity').array).slice(0, 3),
          mistStructure: Array.from(mist.geometry.getAttribute('aMistStructure').array).slice(0, 2),
          surfaceShader: surface.material.customProgramCacheKey(), surfaceColor: surface.material.color.getHexString(),
          turbidity: manager.cloudiness, suspensionColor: manager.suspensionColor, bedMass_g: manager.sedimentBed.amount_g,
          materialMetalness: solid?.material.metalness });
      }
      return { samples: result, pausedUnchanged: a.before === a.snapshot() };
    });
    await page.waitForTimeout(400);
    const first = await inspect();
    if (!first.pausedUnchanged || first.samples.some(s => s.radiusError > 1e-7 || Math.abs(s.bubbleOpacity[1] - 0.44) > 1e-6 || s.bubbleOpacity[2] !== 0 || s.mistStructure[1] !== 0.5)) throw new Error('Optical upload or pause invariant failed');
    const brown = first.samples.find(s => s.formula === 'Fe(OH)3');
    if (!brown || parseInt(brown.surfaceColor.slice(0, 2), 16) <= parseInt(brown.surfaceColor.slice(2, 4), 16)) throw new Error('Colored suspension lost its surface color');
    await page.screenshot({ path: resolve(output, `states-${viewport.width}.png`) });
    await page.evaluate(async () => (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium'));
    await page.waitForTimeout(1200);
    const quality = await inspect();
    if (!quality.pausedUnchanged || quality.samples.some(s => !s.solidCount || s.radiusError > 1e-7)) throw new Error('Quality switch changed retained population');
    report.cases.push({ viewport, first, quality, pass: true });
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, consoleErrors: report.consoleErrors }));
