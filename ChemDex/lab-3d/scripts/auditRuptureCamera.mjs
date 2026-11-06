import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/rupture-camera');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text()); });
  await page.route('**/api/**', r => r.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6786'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const target = page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true });
  await target.waitFor({ timeout: 90000 }); await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, pouringChemical: null, isSimulationPaused: false, timeScale: 0.25,
      leftSidebarOpen: false, rightSidebarOpen: false, activeTool: 'none' });
    const source = await (await fetch('/src/components/three/CameraControls.tsx')).text();
    const fiberURL = source.match(/from\s+["']([^"']*@react-three_fiber[^"']*)["']/)?.[1];
    const { _roots } = await import(fiberURL);
    window.__ruptureRoot = _roots.get(document.querySelector('canvas')).store;
    window.__bursts = []; window.__sparks = [];
    const { vfxBus } = await import('/src/vfx/bus.ts');
    vfxBus.on('explosion', e => window.__bursts.push(e)); vfxBus.on('sparks', e => window.__sparks.push(e));
  });
  const camera = () => page.evaluate(() => {
    const s = window.__ruptureRoot.getState(), c = s.camera;
    return { p: c.position.toArray(), q: c.quaternion.toArray(), target: s.controls?.target.toArray(), projection: c.projectionMatrix.toArray() };
  });
  let previous = '', stable = 0;
  for (let i = 0; i < 40 && stable < 3; i++) {
    await page.waitForTimeout(150); const pose = JSON.stringify(await camera());
    stable = pose === previous ? stable + 1 : 0; previous = pose;
  }
  assert(stable >= 3, 'Camera preset must finish before testing its impulse');
  const base = await camera();
  await page.getByRole('button', { name: 'Atoms', exact: true }).click();
  await page.getByRole('button', { name: 'camera', exact: true }).click();
  await page.getByText('cameraTraumaShake', { exact: true }).click();
  const preview = page.getByRole('button', { name: 'Rung camera · giữ nguyên mẫu', exact: true }).first();
  await preview.click();
  await page.waitForFunction(base => window.__ruptureRoot.getState().camera.projectionMatrix.elements.some((x, i) => Math.abs(x - base[i]) > 1e-6), base.projection);
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.getState().setSimulationPaused(true));
  await page.waitForTimeout(100);
  const paused = await camera();
  assert.deepEqual(paused.p, base.p); assert.deepEqual(paused.q, base.q); assert.deepEqual(paused.target, base.target);
  await page.waitForTimeout(300); assert.deepEqual(await camera(), paused);
  const effects = await page.evaluate(() => ({ bursts: window.__bursts.length, sparks: window.__sparks.length,
    flash: window.__ruptureRoot.getState().scene.getObjectByName('reaction-radiant-flash').visible }));
  assert.deepEqual(effects, { bursts: 0, sparks: 0, flash: false });
  await page.getByText('cameraTraumaShake', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, '01-camera-only-preview-paused.png') });
  report.phases.push({ name: 'camera-preview-after-preset-settles', physicalPoseAndTargetUnchanged: true, pauseVerified: true, ...effects });
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: false, timeScale: 4 }));
  await page.waitForFunction(base => window.__ruptureRoot.getState().camera.projectionMatrix.elements.every((x, i) => Math.abs(x - base[i]) < 1e-12), base.projection);
  assert.deepEqual(await camera(), base);
  await page.emulateMedia({ reducedMotion: 'reduce' }); await preview.click();
  await page.waitForTimeout(250); assert.deepEqual(await camera(), base);
  report.phases.push({ name: 'decay-restores-projection-and-reduced-motion-suppresses-overlay', poseRestored: true, reducedMotionVerified: true });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    (await import('/src/store/useLabEnvironment.ts')).useLabEnvironment.getState().setConditions({ oxygenFraction: 0 });
    store.setState({ timeScale: 0.25 }); store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0]; store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 100 });
    return id;
  });
  await target.selectOption(id);
  await page.getByRole('button', { name: 'Na lớn · nổ khi tiếp xúc', exact: true }).click();
  await page.waitForFunction(async id => (await import('/src/store/useAppStore.ts')).useAppStore.getState().vessels[id].isShattered, id, { timeout: 15000 });
  await page.waitForTimeout(100);
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.getState().setSimulationPaused(true));
  const rupture = await page.evaluate(async id => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), scene = window.__ruptureRoot.getState().scene;
    const light = scene.getObjectByName('reaction-radiant-flash'), spark = scene.getObjectByName('reaction-event-sparks');
    return { shattered: s.vessels[id].isShattered, oxygenFraction: s.vessels[id].environment.oxygenFraction,
      bursts: window.__bursts, sparks: window.__sparks, flashVisible: light.visible, flashIntensity: light.intensity,
      liveSparkInstances: spark.visible ? spark.count : 0, spillMass_g: Object.values(s.spills).reduce((n, p) => n + p.mass_g, 0) };
  }, id);
  assert.equal(rupture.shattered, true); assert.equal(rupture.oxygenFraction, 0);
  assert.equal(rupture.bursts.length, 1); assert.equal(rupture.bursts[0].kind, 'fragmentation');
  assert.equal(rupture.sparks.length, 0); assert.equal(rupture.flashVisible, false); assert.equal(rupture.flashIntensity, 0); assert.equal(rupture.liveSparkInstances, 0);
  assert(rupture.spillMass_g > 50);
  report.phases.push({ name: 'native-bulk-sodium-rupture-with-zero-oxygen', ...rupture });
  await page.screenshot({ path: path.join(output, '02-sodium-fragmentation-without-flash-or-sparks.png') });
  // Renderer contract only: a synthetic finite radiant packet is not a chemical experiment.
  await page.evaluate(async () => {
    (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: false, timeScale: 0.25 });
    (await import('/src/vfx/bus.ts')).vfxBus.emit('explosion', { vesselId: 'optical-contract', position: [0, 0, 0],
      kind: 'combustion', intensity: 1, radiantEnergy_J: 40 });
  });
  await page.waitForFunction(() => window.__ruptureRoot.getState().scene.getObjectByName('reaction-radiant-flash').visible);
  report.phases.push({ name: 'explicit-synthetic-radiant-packet-can-illuminate', rendererContractOnly: true, visible: true });
  assert.equal(report.errors.length, 0, report.errors.join('\n')); assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
