import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/spill-sodium');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text());
  });
  await page.route('**/api/**', r => r.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6785'}/?vfx=1&seed=42`,
    { waitUntil: 'domcontentloaded', timeout: 120000 });
  const target = page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true });
  await target.waitFor({ timeout: 90000 }); await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, wasteMass_g: 0, wasteContents: [], pouringChemical: null,
      isSimulationPaused: true, timeScale: 0.25, leftSidebarOpen: false, rightSidebarOpen: false, activeTool: 'none' });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 100, name: 'Sodium after glass break' });
    const source = await (await fetch('/src/components/three/WorkbenchSpills.tsx')).text();
    const fiberURL = source.match(/from\s+["']([^"']*@react-three_fiber[^"']*)["']/)?.[1];
    const { _roots } = await import(fiberURL);
    window.__sodiumAuditScene = _roots.get(document.querySelector('canvas')).store.getState().scene;
    return id;
  });
  await target.selectOption(id);
  await page.getByRole('button', { name: 'Na · tiếp tục sau vỡ bình', exact: true }).click();
  await page.waitForFunction(() => {
    let visible = false;
    window.__sodiumAuditScene.traverse(o => { if (o.name.startsWith('spill-sodium:') && o.visible) visible = true; });
    return visible;
  }, null, { timeout: 20000 });
  const observations = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(120);
    observations.push(await page.evaluate(async () => {
      const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), p = Object.values(s.spills)[0];
      const mesh = window.__sodiumAuditScene.getObjectByName(`spill-sodium:${p.id}`);
      const metal_g = p.contents.filter(c => c.formula === 'Na').reduce((n, c) => n + c.mass_g, 0);
      return { position: mesh.position.toArray(), scale: mesh.scale.x, metal_g, gasRate_mol_s: p.gasRate_mol_s,
        elapsed_s: p.sodiumContact.elapsed_s, regime: p.sodiumContact.regime };
    }));
  }
  assert(observations.every(o => o.regime === 'skitter' && o.gasRate_mol_s > 0));
  const spread = Math.max(...observations.map(o => Math.hypot(o.position[0] - observations[0].position[0], o.position[2] - observations[0].position[2])));
  assert(spread > 0.005, 'The actual sodium mesh must move across the puddle');
  assert(observations.at(-1).metal_g < observations[0].metal_g && observations.at(-1).scale < observations[0].scale);
  for (const o of observations) {
    const expectedRadius = Math.cbrt(o.metal_g / 0.971 * 1e-6 / (4 * Math.PI / 3)) / 0.035;
    assert(Math.abs(o.scale / expectedRadius - 1) < 0.02, 'Rendered metal radius must follow the finite mass');
  }
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const snapshot = () => page.evaluate(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), p = Object.values(s.spills)[0];
    const mesh = window.__sodiumAuditScene.getObjectByName(`spill-sodium:${p.id}`);
    return { matter: JSON.stringify({ spills: s.spills, gases: s.workbenchEscapedGas_g }),
      position: mesh.position.toArray(), scale: mesh.scale.toArray(), rotation: mesh.rotation.toArray() };
  });
  const paused = await snapshot(); await page.waitForTimeout(400); assert.deepEqual(await snapshot(), paused);
  await page.screenshot({ path: path.join(output, '01-sodium-moves-on-bench.png') });
  report.phases.push({ name: 'real-pellet-motion-and-mass-scaled-shrinkage', spread_scene: spread, observations, pauseVerified: true });
  await page.getByRole('button', { name: 'Thay bình đã vỡ', exact: true }).click();
  assert.equal((await snapshot()).matter, paused.matter, 'Replacing glass must leave the puddle untouched');
  const replacement = await page.evaluate(async id => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), v = s.vessels[id];
    return { bodyRevision: v.bodyRevision, shattered: v.isShattered, sampleMass_g: v.mass_g,
      temperature_c: v.temperature_c, hasProgram: v.studioProgramId !== undefined };
  }, id);
  assert.equal(replacement.shattered, false); assert.equal(replacement.sampleMass_g, 0); assert.equal(replacement.hasProgram, false);
  await page.screenshot({ path: path.join(output, '02-new-glass-keeps-live-spill.png') });
  report.phases.push({ name: 'body-replacement-preserves-puddle', ...replacement });
  await page.getByRole('button', { name: '4x', exact: true }).click();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForFunction(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState();
    return Object.values(s.spills).every(p => !p.contents.some(c => c.formula === 'Na' && c.mass_g > 1e-10) && !(p.gasRate_mol_s > 0));
  }, null, { timeout: 20000 });
  await page.waitForFunction(() => {
    let visible = false;
    window.__sodiumAuditScene.traverse(o => { if (o.name.startsWith('spill-sodium:') && o.visible) visible = true; });
    return !visible;
  }, null, { timeout: 20000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const final = await page.evaluate(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), pools = Object.values(s.spills);
    const meshes = []; window.__sodiumAuditScene.traverse(o => { if (o.name.startsWith('spill-sodium:') && o.visible) meshes.push(o.name); });
    return { remainingMass_g: pools.reduce((n, p) => n + p.mass_g, 0), hydrogen_g: s.workbenchEscapedGas_g.H2,
      residualGasRate_mol_s: pools.reduce((n, p) => n + (p.gasRate_mol_s ?? 0), 0), visibleSodiumMeshes: meshes };
  });
  assert.equal(final.visibleSodiumMeshes.length, 0); assert.equal(final.residualGasRate_mol_s, 0);
  assert(Math.abs(final.hydrogen_g - 0.1 / 22.99 / 2 * 2.016) < 1e-8);
  assert(Math.abs(final.remainingMass_g + final.hydrogen_g - 50.1) < 1e-7);
  report.phases.push({ name: 'finite-contact-completes-and-renderer-removes-exhausted-metal', ...final });
  await page.screenshot({ path: path.join(output, '03-sodium-exhausted.png') });
  const cleaned = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.getState().cleanSpills();
    const s = store.getState();
    return { waste_g: s.wasteMass_g, hydrogen_g: s.workbenchEscapedGas_g.H2, puddles: Object.keys(s.spills).length };
  });
  await page.getByLabel('Phản ứng trên bàn', { exact: true }).waitFor();
  assert.match(await page.getByLabel('Phản ứng trên bàn', { exact: true }).innerText(), /H₂ thoát/);
  assert.equal(cleaned.puddles, 0); assert.equal(cleaned.hydrogen_g, final.hydrogen_g);
  assert(Math.abs(cleaned.waste_g + cleaned.hydrogen_g - 50.1) < 1e-7);
  report.phases.push({ name: 'cleanup-retains-persistent-hydrogen-receipt', ...cleaned });
  await page.screenshot({ path: path.join(output, '04-hydrogen-receipt-after-cleanup.png') });
  assert.equal(report.errors.length, 0, report.errors.join('\n')); assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
