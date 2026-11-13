import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = 'artifacts/reaction-upgrade';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], checks: {}, modelBounds: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => route.abort());
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6779/?vfx=1', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).waitFor({ timeout: 90000 });
  await page.evaluate(async () => {
    const appSource = await (await fetch('/src/App.tsx')).text();
    const storeUrl = appSource.match(/from "([^"\n]*\/store\/useAppStore\.ts[^"\n]*)"/)[1];
    const { useAppStore: store } = await import(storeUrl);
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    const { useToolDockStore } = await import('/src/handling/toolDockState.ts');
    useQualityStore.getState().setPreference('low');
    useToolDockStore.setState({ positions: {}, deployed: {}, dragging: null });
    store.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      inFlightPours: [], spills: {}, pouringChemical: null, activeTool: 'none', moveMode: true,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false });
    window.upgradeStore = store;
    window.upgradeRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots;
  });
  await page.waitForTimeout(1200);
  await page.getByRole('button', { name: 'Đóng Studio', exact: true }).click();
  const visibleTools = await page.evaluate(() => {
    const tools = [];
    for (const root of window.upgradeRoots.values()) root.store.getState().scene.traverse(o => {
      if (o.name?.startsWith('tool-') && !['tool-balance', 'tool-burette'].includes(o.name) && o.visible) tools.push(o.name);
    });
    return tools;
  });
  assert.deepEqual(visibleTools, []);
  report.checks.moveModeDoesNotSpawnTools = true;
  report.checks.spawns = await page.evaluate(async () => {
    const store = window.upgradeStore;
    const { benchRadius, BENCH_CLEARANCE } = await import('/src/core/benchPlacement.ts');
    for (let i = 0; i < 18; i++) store.getState().addVessel(['beaker', 'flask', 'watch_glass', 'test_tube', 'cylinder', 'petri_dish'][i % 6]);
    for (let i = 0; i < 4; i++) store.getState().addBurner();
    const state = store.getState();
    const objects = [...Object.values(state.vessels), ...Object.values(state.burners).map(b => ({ ...b, type: 'burner', capacity_ml: 0 }))];
    let minimumClearance = Infinity;
    for (let i = 0; i < objects.length; i++) for (let j = 0; j < i; j++) {
      const a = objects[i], b = objects[j];
      minimumClearance = Math.min(minimumClearance, Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]) - benchRadius(a.type, a.capacity_ml) - benchRadius(b.type, b.capacity_ml));
    }
    return { count: objects.length, minimumClearance, required: BENCH_CLEARANCE,
      unlit: Object.values(state.burners).every(b => !b.isOn) };
  });
  assert.equal(report.checks.spawns.count, 22);
  assert.ok(report.checks.spawns.minimumClearance >= report.checks.spawns.required - 1e-9);
  assert.ok(report.checks.spawns.unlit);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/bench-spawn.png` });
  // Read the actual rendered body's geometry for all vessel types, with no
  // selection rings. This catches support geometry outside fluid contours.
  for (const type of ['beaker', 'flask', 'test_tube', 'cylinder', 'watch_glass', 'evaporating_dish', 'crucible', 'petri_dish', 'volumetric_flask', 'separatory_funnel', 'filter_funnel', 'mortar_pestle', 'condenser', 'wash_bottle', 'test_tube_rack', 'tongs', 'hot_plate', 'retort_stand', 'retort_clamp', 'stopper', 'pneumatic_trough']) {
    await page.evaluate(type => {
      const store = window.upgradeStore;
      store.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], selectedVesselId: null });
      store.getState().addVessel(type);
      const id = store.getState().selectedVesselId;
      store.setState({ selectedVesselId: null });
      window.upgradeModelId = id;
    }, type);
    await page.waitForTimeout(400);
    const bounds = await page.evaluate(async () => {
      const { Box3, Vector3 } = await import('/node_modules/.vite/deps/three.js');
      const { renderedVesselBody } = await import('/src/simulation/render/vesselBodyFrames.ts');
      const { benchRadius } = await import('/src/core/benchPlacement.ts');
      const v = window.upgradeStore.getState().vessels[window.upgradeModelId];
      let body = renderedVesselBody(v.id);
      if (!body) for (const root of window.upgradeRoots.values()) root.store.getState().scene.traverse(o => {
        if (o.type === 'Group' && o.position.distanceTo({ x: v.position[0], y: v.position[1], z: v.position[2] }) < 1e-9 && o.children.length > 0) body ??= o;
      });
      if (!body) return { type: v.type, missing: true };
      body.updateWorldMatrix(true, true);
      const box = new Box3();
      let lowest = '';
      let actualRadius = 0;
      const point = new Vector3();
      body.traverseVisible(o => {
        if (!o.isMesh || o.isInstancedMesh || o.geometry?.type === 'RingGeometry'
          || ['ShaderMaterial', 'MeshBasicMaterial'].includes(o.material?.type)) return;
        const meshBox = new Box3().setFromObject(o, true);
        if (meshBox.min.y < box.min.y) lowest = `${o.name}:${o.geometry.type}:${o.material.type}`;
        box.union(meshBox);
        const positions = o.geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
          point.fromBufferAttribute(positions, i).applyMatrix4(o.matrixWorld);
          actualRadius = Math.max(actualRadius, Math.hypot(point.x - v.position[0], point.z - v.position[2]));
        }
      });
      return { type: v.type, origin: v.position[1], minY: box.min.y, gap: box.min.y + 1.175, lowest,
        actualRadius,
        plannedRadius: benchRadius(v.type, v.capacity_ml) };
    });
    report.modelBounds.push(bounds);
  }
  for (const bound of report.modelBounds) {
    assert.ok(!bound.missing && Number.isFinite(bound.gap), `Missing model ${bound.type}`);
    assert.ok(Math.abs(bound.gap) < 1e-5, `${bound.type} support gap: ${bound.gap}`);
    assert.ok(bound.actualRadius <= bound.plannedRadius + 1e-6, `${bound.type} extends beyond its placement footprint`);
  }
  report.checks.renderedSupportsAndFootprints = report.modelBounds.length;
  await page.evaluate(() => window.upgradeStore.setState({ leftSidebarOpen: true }));
  await page.getByRole('button', { name: 'Bài học', exact: true }).click();
  await page.getByRole('button', { name: 'Kho mở rộng & chuỗi', exact: true }).click();
  await page.getByRole('heading', { name: /Kho mở rộng.*1.300/ }).waitFor();
  await page.getByRole('textbox', { name: 'Tìm trong kho phản ứng' }).fill('BaSO4');
  const equation = page.locator('button').filter({ hasText: 'BaCl2' }).filter({ hasText: 'Na2SO4' }).first();
  await equation.click();
  await page.getByTestId('catalog-observation-guide').waitFor();
  assert.equal(await page.getByTestId('catalog-observation-guide').locator('ol > li').count(), 4);
  await page.screenshot({ path: `${output}/catalog-sequence.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: `${output}/catalog-mobile.png` });
  report.checks.catalogGuideDesktopAndMobile = true;
  await writeFile(`${output}/browser-review.json`, JSON.stringify(report, null, 2));
  assert.deepEqual(report.errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
