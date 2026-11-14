import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/stirring-rod-fidelity');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  // Parallel source work must not hot-reload this measured interaction midway.
  await page.routeWebSocket('**', () => {});
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(message.text())) report.shaderErrors.push(message.text());
  });
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  const id = await page.evaluate(async () => {
    window.rodAuditModule = async modulePath => import(performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === modulePath)?.name ?? modulePath);
    const { useAppStore: store } = await window.rodAuditModule('/src/store/useAppStore.ts');
    const { useQualityStore } = await window.rodAuditModule('/src/vfx/quality.ts');
    window.rodAuditBindings = { store,
      ...await window.rodAuditModule('/src/science/stirring.ts'),
      ...await window.rodAuditModule('/src/science/vesselGeometry.ts'),
      ...await window.rodAuditModule('/src/simulation/core/SimulationEngine.ts') };
    useQualityStore.getState().setPreference('low');
    window.rodAuditRoots = (await window.rodAuditModule('/node_modules/.vite/deps/@react-three_fiber.js'))._roots;
    store.setState({ vessels: {}, vesselIds: [], selectedVesselId: null, burners: {}, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, inFlightPours: [], spills: {}, workbenchEscapedGas_g: {}, pouringChemical: null,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false, moveMode: false, activeTool: 'none' });
    store.getState().addVessel('test_tube');
    const id = store.getState().vesselIds[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 50, volume_ml: 25, volume: 0.5,
      rotationY: 0, rotationZ: 0, physicalMotion: undefined, isLocked: true, stirringIntensity: 0.3,
      temperature_c: 25, mass_g: 25, contents: [{ formula: 'H2O', phase: 'l', mass_g: 25, moles: 25 / 18.015 }],
      substances: ['H2O'], liquidColor: '#f8fafc', isSealed: false, isShattered: false });
    store.setState({ selectedVesselId: id, activeTool: 'stirring_rod', isSimulationPaused: false });
    store.getState().focusVessel(id);
    return id;
  });
  const snapshot = () => page.evaluate(async id => {
    const { useAppStore: store } = await window.rodAuditModule('/src/store/useAppStore.ts');
    const { vesselAgitation } = await window.rodAuditModule('/src/science/stirring.ts');
    const { STIRRING_ROD_RADIUS } = await window.rodAuditModule('/src/science/stirringRodPose.ts');
    const { getWorldVesselProfile } = await window.rodAuditModule('/src/pour/physics/profiles.ts');
    const { vesselWorldLiquidSurfaceY } = await window.rodAuditModule('/src/science/vesselGeometry.ts');
    const { SimulationEngine } = await window.rodAuditModule('/src/simulation/core/SimulationEngine.ts');
    const v = store.getState().vessels[id], profile = getWorldVesselProfile(v.type, v.capacity_ml);
    let rod;
    for (const root of window.rodAuditRoots.values()) rod ??= root.store.getState().scene.getObjectByName('tool-stirring_rod');
    const tip = rod?.position.toArray(), tipY = tip ? tip[1] - v.position[1] : 999;
    return { tip, rotation: rod?.rotation.toArray(), surface: v.position[1] + vesselWorldLiquidSurfaceY(v),
      floor: v.position[1] + profile.baseY, radius: STIRRING_ROD_RADIUS,
      orbit: tip ? Math.hypot(tip[0] - v.position[0], tip[2] - v.position[2]) : 999,
      wall: profile.r(tipY), mouth: profile.mouthR, agitation: vesselAgitation(v, store.getState()),
      omega: SimulationEngine.findManager(id)?.vortex.angularSpeed_rad_s ?? 0,
      activeTool: store.getState().activeTool, paused: store.getState().isSimulationPaused,
      physicalRotation: v.physicalMotion?.rotation };
  }, id);
  await page.waitForFunction(id => {
    const { store, vesselAgitation, vesselWorldLiquidSurfaceY, SimulationEngine } = window.rodAuditBindings;
    const rod = [...window.rodAuditRoots.values()].map(root => root.store.getState().scene.getObjectByName('tool-stirring_rod')).find(Boolean);
    const vessel = store.getState().vessels[id];
    return !!rod && Math.abs(rod.rotation.x) < 1e-6
      && rod.position.y + 0.035 < vessel.position[1] + vesselWorldLiquidSurfaceY(vessel)
      && (SimulationEngine.findManager(id)?.vortex.angularSpeed_rad_s ?? 0) > 0
      && vesselAgitation(vessel, store.getState()) > 0;
  }, id, { timeout: 45000 });
  await page.waitForTimeout(700);
  const first = await snapshot();
  report.phases.push({ name: 'narrow-tube-immersion', ...first });
  assert(first.tip, 'Rod must render');
  assert(first.tip[1] - first.radius > first.floor && first.tip[1] + first.radius < first.surface, 'Rounded tip stays submerged above bottom');
  assert(first.orbit + first.radius < Math.min(first.wall, first.mouth), 'Entire vertical rod clears the narrow tube');
  assert(first.omega > 0 && first.agitation === 0.3, 'Insertion completes and starts the pure-water carrier');
  await page.screenshot({ path: path.join(output, '01-test-tube-stirring.png') });
  await page.evaluate(async id => {
    const { useAppStore: store } = await window.rodAuditModule('/src/store/useAppStore.ts');
    store.getState().setVesselState(id, { position: [0.8, 0.4, -0.5] });
  }, id);
  await page.waitForTimeout(250);
  const moved = await snapshot();
  assert(moved.tip[1] - moved.radius > moved.floor && moved.tip[1] + moved.radius < moved.surface);
  assert(moved.orbit + moved.radius < Math.min(moved.wall, moved.mouth));
  report.phases.push({ name: 'moved-tube-follows-tip', ...moved });
  await page.evaluate(async () => (await window.rodAuditModule('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: true }));
  await page.waitForTimeout(100);
  const paused = await snapshot();
  await page.mouse.move(650, 500); await page.mouse.move(1000, 700, { steps: 15 });
  await page.waitForTimeout(200);
  assert.deepEqual((await snapshot()).tip, paused.tip, 'Pause freezes the physical rod');
  report.phases.push({ name: 'paused-rod', frozen: true });
  await page.evaluate(async id => {
    const { useAppStore: store } = await window.rodAuditModule('/src/store/useAppStore.ts');
    store.setState({ isSimulationPaused: false, activeTool: 'none' });
    store.getState().stirVessel(id);
  }, id);
  await page.waitForTimeout(350);
  assert((await snapshot()).agitation === 0.3, 'Inspector pulse uses the same rod and strength');
  await page.screenshot({ path: path.join(output, '02-inspector-pulse.png') });
  await page.waitForTimeout(2500);
  assert((await snapshot()).agitation === 0, 'Timed pulse ends');
  report.phases.push({ name: 'inspector-pulse', stopped: true });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await writeFile(path.join(output, 'audit.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
