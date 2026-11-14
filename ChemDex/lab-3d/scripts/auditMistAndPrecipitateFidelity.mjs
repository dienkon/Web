import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6777';
const output = 'artifacts/mist-precipitate-fidelity';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|webgl|THREE/i.test(m.text())) errors.push(m.text()); });
try {
  await page.goto(`${origin}/scripts/fixtures/appearance.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.appearanceReady && window.specimenScene, { timeout: 60000 });
  const setup = await page.evaluate(() => window.renderSpecimens([
    { formula: 'PbI2', mode: 'product' },
    { formula: 'PbI2', mode: 'product', formation: 'CRYSTAL_PLATE' },
    { formula: 'AgCl', mode: 'product' },
    { formula: 'Cu(OH)2', mode: 'product' },
    { formula: 'Fe(OH)3', mode: 'product' },
    { formula: 'BaSO4', mode: 'product', grams: 0 },
  ]));
  const ids = setup.vessels.map(v => v.id);
  await page.waitForFunction(ids => ids.every(id => window.specimenScene.getObjectByName(`physical_mist_${id}`)), ids);
  // Existence precedes the first frame that copies the actual glass transform.
  await page.waitForTimeout(600);
  await page.evaluate(async ids => {
    const { physicalEffectsRuntime } = await import('/src/simulation/core/PhysicalEffectsRuntime.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const store = window.specimenStore, vessels = { ...store.getState().vessels }, id = ids[5];
    vessels[id] = { ...vessels[id], temperature_c: 100, waterVaporOutflow_g_s: 0.15,
      environment: { temperature_c: 25, pressure_atm: 1, oxygenFraction: 0.2095, airSpeed_m_s: 0, relativeHumidity: 0.5 },
      waterVaporTemperature_c: 100, waterVaporPartialPressure_Pa: 101325 };
    store.setState({ vessels, isSimulationPaused: true });
    window.fidelity = { runtime: physicalEffectsRuntime, engine: SimulationEngine, ids };
    // These are supplied specimen/source states, not a heat or reaction solver run.
    for (let i = 0; i < 60; i++) physicalEffectsRuntime.advance(1 / 60, false, 1);
  }, ids);
  await page.waitForFunction(() => {
    const { engine, ids } = window.fidelity, id = ids[5];
    const particles = engine.findManager(id).evaporationSystem.particles;
    const mesh = window.specimenScene.getObjectByName(`physical_mist_${id}`);
    return particles.length > 0 && mesh.visible && mesh.count === particles.length;
  });
  const rendered = await page.evaluate(() => {
    const { engine, ids } = window.fidelity;
    return ids.map(id => {
      const manager = engine.findManager(id), mesh = window.specimenScene.getObjectByName(`physical_mist_${id}`);
      return { id, profiles: [...manager.precipitationSystems.values()].map(s => ({ id: s.profile.id, morphology: s.profile.morphology })),
        particles: manager.evaporationSystem.particles.length, visible: mesh.visible, instanceCount: mesh.count,
        alpha: [...mesh.geometry.getAttribute('aMistOpacity').array].slice(0, mesh.count),
        matricesFinite: [...mesh.instanceMatrix.array].every(Number.isFinite),
        particlePositions: manager.evaporationSystem.particles.map(p => [p.x, p.birthY, p.z]),
        sourcePosition: window.specimenScene.getObjectByName(`physical_sim_${id}`).matrixWorld.elements.slice(12, 15),
        worldMatrix: [...mesh.matrixWorld.elements],
        acceptedVapor_g: manager.evaporationSystem.acceptedVapor_g };
    });
  });
  assert.equal(rendered[0].profiles[0].morphology, 'fine_powder');
  assert.equal(rendered[1].profiles[0].morphology, 'crystalline');
  const mist = rendered[5];
  assert.ok(mist.particles > 0 && mist.visible && mist.instanceCount === mist.particles);
  assert.ok(mist.alpha.some(a => a > 0) && mist.alpha.every(a => a >= 0 && a <= 1) && mist.matricesFinite);
  assert.ok(Math.abs(mist.acceptedVapor_g - 0.15) < 1e-10);
  assert.ok(mist.worldMatrix.every((value, i) => Math.abs(value - (i % 5 === 0 ? 1 : 0)) < 1e-10), 'world-space mist mesh must cancel its carrier transform');
  assert.ok(mist.particlePositions.every(p => Math.abs(p[0] - mist.sourcePosition[0]) < 1 && Math.abs(p[2] - mist.sourcePosition[2]) < 1), JSON.stringify({ message: 'mist must remain above its own vessel in still air', mist }));
  // Caption the controlled source truthfully; the general fixture's default is 25 C.
  await page.evaluate(() => {
    document.querySelector('b').nextElementSibling.textContent = 'Mẫu kết tủa 25 °C · phiến PbI₂ được gán đường tái kết tinh · cốc cuối: nguồn hơi 100 °C, 0,15 g/s';
    const labels = [...document.querySelectorAll('div')].filter(e => e.textContent?.startsWith('BaSO4 ·') && e.children.length === 0);
    labels.forEach(e => { e.textContent = 'H₂O · nguồn hơi cấp sẵn · kiểm tra sương ngoài miệng'; });
  });
  await page.screenshot({ path: `${output}/specimens-and-mist.png` });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(r => r.name).find(s => /@react-three_fiber\.js/.test(s));
    const { _roots } = await import(url), { camera, scene } = _roots.get(document.querySelector('canvas')).store.getState();
    camera.position.set(4.9, 1.2, 9); camera.lookAt(4.9, -0.05, 2.7); camera.zoom = 300; camera.updateProjectionMatrix();
    scene.background.set('#273747');
    const { ids } = window.fidelity;
    for (const id of ids.slice(0, 5)) scene.getObjectByName(`physical_sim_${id}`).parent.parent.visible = false;
    const carrier = scene.getObjectByName(`physical_sim_${ids[5]}`).parent.parent;
    for (const child of carrier.children) if (child.isMesh && child.geometry.type === 'PlaneGeometry') child.visible = false;
    document.querySelector('b').parentElement.style.color = '#e4e9ed';
    // Hide overview labels for the optical close-up.
    for (const div of document.querySelectorAll('div')) {
      if (div.style.position === 'absolute' && div.style.transform) div.style.visibility = 'hidden';
    }
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}/mist-closeup.png` });
  const tail = await page.evaluate(() => {
    const { runtime, engine, ids } = window.fidelity, id = ids[5], store = window.specimenStore;
    const system = engine.findManager(id).evaporationSystem, before = JSON.stringify(system.particles);
    runtime.advance(1, true, 1);
    const paused = before === JSON.stringify(system.particles);
    const vessels = { ...store.getState().vessels };
    vessels[id] = { ...vessels[id], temperature_c: 500, waterVaporOutflow_g_s: 0 };
    store.setState({ vessels });
    for (let i = 0; i < 150; i++) runtime.advance(1 / 60, false, 1);
    return { paused, remaining: system.particles.length, acceptedVapor_g: system.acceptedVapor_g };
  });
  assert.ok(tail.paused); assert.equal(tail.remaining, 0);
  assert.equal(tail.acceptedVapor_g, mist.acceptedVapor_g);
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/audit.json`, JSON.stringify({ renderer: 'Chromium WebGL / SwiftShader',
    scope: 'Production meshes/materials with supplied specimen inventories and vapor source; no reaction, thermal or experimental calibration claim.',
    rendered, tail, errors }, null, 2) + '\n');
  console.log(JSON.stringify({ output, mistParticles: mist.particles, tail, errors }));
} finally { await browser.close(); }
