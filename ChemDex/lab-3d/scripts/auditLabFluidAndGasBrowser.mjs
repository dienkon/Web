import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6777';
const output = 'artifacts/lab-fluid-gas'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) errors.push(message.text()); });
async function start(name, id, intensity = '0.65') {
  await page.evaluate(() => { window.__fluidAudit = null; });
  await page.getByRole('button', { name, exact: true }).first().click();
  await page.waitForFunction(id => window.__fluidAudit?.program.id === id, id);
  await page.getByRole('combobox', { name: 'Mức khuấy tự động' }).selectOption(intensity);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(p => p.name).find(s => /@react-three_fiber\.js/.test(s));
    const { _roots } = await import(url); window.__fluidRoot = _roots.get(document.querySelector('canvas')).store;
  });
}
async function advance(predicate) {
  await page.evaluate(predicate => {
    const e = window.__fluidAudit, done = new Function('e', `return ${predicate}`); e.paused = false; e.speed = 1;
    for (let i = 0; i < 15000 && !done(e) && !e.error; i++) e.tick(1 / 60);
    e.paused = true; window.__fluidRoot.getState().invalidate();
    if (!done(e)) throw new Error(`${predicate}: ${e.phase}, ${e.error ?? ''}`);
  }, predicate);
  await page.waitForTimeout(250);
}
async function snapshot() {
  return page.evaluate(() => {
    const e = window.__fluidAudit, v = e.physics.vortex.surface;
    const solids = [...e.physics.precipitationSystems.values()];
    return { program: e.program.id, phase: e.phase, omega: e.physics.vortex.angularSpeed_rad_s,
      center: v?.offset, mean: v?.meanLevel, amplitude: v?.amplitude,
      precipitates: solids.map(s => ({ formula: s.profile.id, morphology: s.profile.morphology, color: s.profile.color,
        particles: s.particles.length, represented_g: s.representedMass_g,
        ledger_g: e.sample.contents.filter(c => c.phase === 's' && c.formula === s.profile.id).reduce((sum, c) => sum + c.mass_g, 0),
        positiveAngularMomentum: s.particles.filter(p => p.x * p.vz - p.z * p.vx > 0).length,
        submerged: s.particles.every(p => { const b = s.renderBounds, surface = b.surfacePlane?.vortex;
          const height = surface ? surface.offset + surface.amplitude * (p.x * p.x + p.z * p.z) / (surface.coreRadius ** 2 + p.x * p.x + p.z * p.z) : b.surfaceY;
          return p.y <= height + 1e-8 && p.y >= b.liquidBottomY - 1e-8; }) })),
    };
  });
}
try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(p => p.name).find(s => /\/AutoExperiment\.ts(\?|$)/.test(s));
    const { AutoExperiment } = await import(url), original = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (dt) { window.__fluidAudit = this; return original.call(this, dt); };
  });
  await start('CuSO4 + NaOH', 'cuso4_naoh', '0.3');
  await advance("e.phase === 'condition' && e.phaseTime > 3.7");
  await page.getByRole('button', { name: 'Góc mặt dịch' }).click(); await page.waitForTimeout(800);
  const weak = await snapshot(); await page.screenshot({ path: `${output}/gentle-vortex.png` });
  await start('CuSO4 + NaOH', 'cuso4_naoh', '0.95');
  await advance("e.phase === 'condition' && e.phaseTime > 3.7");
  await page.getByRole('button', { name: 'Góc mặt dịch' }).click(); await page.waitForTimeout(800);
  const strong = await snapshot(); await page.screenshot({ path: `${output}/strong-vortex.png` });
  assert.ok(strong.omega > weak.omega * 2); assert.ok(strong.center < weak.center - 0.02);
  const copper = strong.precipitates.find(s => s.formula === 'Cu(OH)2');
  assert.equal(copper.morphology, 'gel_like'); assert.equal(copper.submerged, true);
  assert.ok(Math.abs(copper.represented_g - copper.ledger_g) < 1e-8);
  assert.ok(copper.positiveAngularMomentum > copper.particles / 2, 'Suspended flocs must follow the actual fluid rotation');
  const pause = await page.locator('[data-auto-elapsed]').getAttribute('data-auto-elapsed');
  await page.waitForTimeout(400); assert.equal(await page.locator('[data-auto-elapsed]').getAttribute('data-auto-elapsed'), pause);
  await advance("e.phase === 'observe' && e.phaseTime > 2.5"); const coasting = await snapshot();
  assert.ok(coasting.omega > 0 && coasting.omega < strong.omega);
  await advance("e.phase === 'complete' && e.phaseTime > 1"); const rested = await snapshot();
  assert.ok(rested.omega < coasting.omega);

  await start('NH3 + HCl', 'nh3_hcl');
  await advance("e.phase === 'dose' && e.phaseTime > 1.5");
  const gas = await page.evaluate(() => {
    const e = window.__fluidAudit, { scene } = window.__fluidRoot.getState(), d = e.donors[e.donorIndex];
    return { pose: e.donorPose, source: !!scene.getObjectByName(`auto_gas_supply_${d.row.formula}`),
      tube: !!scene.getObjectByName(`auto_gas_line_${d.row.formula}`),
      valve: scene.getObjectByName(`auto_gas_valve_${d.row.formula}`)?.userData.open,
      inlet: scene.getObjectByName(`auto_gas_inlet_${d.row.formula}`)?.userData.connected,
      pouring: scene.getObjectByName('auto_transfer_stream')?.visible, flow_ml_s: e.gasDeliveryRate_ml_s };
  });
  assert.equal(gas.pose.tilt, 0); assert.equal(gas.source, true); assert.equal(gas.tube, true);
  assert.equal(gas.valve, true); assert.equal(gas.inlet, true); assert.equal(gas.pouring, false); assert.ok(gas.flow_ml_s > 0);
  await page.screenshot({ path: `${output}/gas-syringe-tubing.png` });
  await advance("e.phase === 'return'");
  assert.equal(await page.evaluate(() => window.__fluidAudit.gasValveOpen), false);

  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill('Ca(OH)2');
  const lime = page.getByRole('button').filter({ hasText: /Ca\(OH\)2.*CO2|CO2.*Ca\(OH\)2/ }).first();
  assert.ok(await lime.count(), 'The catalog must expose a gas-to-liquid experiment');
  let gasSubmerged;
  {
    await lime.click(); await page.waitForTimeout(300);
    await advance("e.donors[e.donorIndex]?.row.phase === 'g' && e.phase === 'dose' && e.phaseTime > 1.5");
    const submerged = await page.evaluate(() => {
      const e = window.__fluidAudit, d = e.donors[e.donorIndex], inlet = window.__fluidRoot.getState().scene.getObjectByName(`auto_gas_inlet_${d.row.formula}`);
      return { submerged: inlet?.userData.submerged, water_ml: e.sample.volume_ml };
    });
    assert.equal(submerged.submerged, true); assert.ok(submerged.water_ml > 0);
    gasSubmerged = submerged;
    await page.screenshot({ path: `${output}/gas-inlet-submerged.png` });
  }

  await page.getByRole('tab', { name: 'Thao tác', exact: true }).click();
  await page.locator('#manual-lab canvas').waitFor({ state: 'visible', timeout: 60000 });
  const id = await page.evaluate(async () => {
    const resource = pattern => performance.getEntriesByType('resource').map(p => p.name).find(s => pattern.test(s));
    const { useAppStore } = await import(resource(/\/useAppStore\.ts(\?|$)/)); window.__manualStore = useAppStore;
    const { SimulationEngine } = await import(resource(/\/SimulationEngine\.ts(\?|$)/)); window.__manualEngine = SimulationEngine;
    const id = useAppStore.getState().prepareStudioProgram('cuso4_naoh');
    useAppStore.getState().setVesselState(id, { stirringIntensity: 0.3, studioProgramId: undefined,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }], substances: ['H2O'],
      mass_g: 30, volume_ml: 30, volume: 0.3, ph: 7, liquidColor: '#f8fafc',
      hasPrecipitate: false, precipitateAmount_g: 0, precipitateSubstance: undefined, hasGas: false });
    useAppStore.getState().openVesselInfo(id); useAppStore.getState().setActiveTool('stirring_rod');
    useAppStore.getState().setSimulationPaused(false); return id;
  });
  await page.waitForFunction(id => (window.__manualEngine.findManager(id)?.vortex.angularSpeed_rad_s ?? 0) > 5, id, { timeout: 60000 });
  await page.waitForTimeout(1000);
  const manualWeak = await page.evaluate(id => window.__manualEngine.findManager(id).vortex.angularSpeed_rad_s, id);
  await page.getByRole('combobox', { name: 'Mức khuấy', exact: true }).selectOption('0.95');
  await page.waitForFunction(({ id, speed }) => window.__manualEngine.findManager(id).vortex.angularSpeed_rad_s > speed * 1.5, { id, speed: manualWeak }, { timeout: 60000 });
  await page.evaluate(() => window.__manualStore.getState().setSimulationPaused(true));
  const manualPhase = await page.evaluate(id => window.__manualEngine.findManager(id).vortex.phase_rad, id);
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(id => window.__manualEngine.findManager(id).vortex.phase_rad, id), manualPhase);
  await page.screenshot({ path: `${output}/manual-vortex.png` });
  assert.deepEqual(errors, []);
  const report = { weak, strong, coasting, rested, gas, gasSubmerged, manualIntensityAndPause: true, noShaderErrors: true, errors };
  writeFileSync(`${output}/browser.json`, JSON.stringify(report, null, 2) + '\n'); console.log(report);
} catch (error) {
  console.error({ errors }); await page.screenshot({ path: `${output}/failure.png` }).catch(() => {}); throw error;
} finally { await browser.close(); }
