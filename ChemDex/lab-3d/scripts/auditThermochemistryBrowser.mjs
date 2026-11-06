import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/thermochemistry-browser');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], samples: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text());
  });
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6783'}/?vfx=1&seed=42`,
    { waitUntil: 'domcontentloaded', timeout: 120000 });
  const target = page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true });
  await target.waitFor({ timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, pouringChemical: null,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false, activeTool: 'none' });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 100, name: 'Thermochemistry audit' });
    return id;
  });
  await target.selectOption(id);
  await page.getByRole('button', { name: 'Programs', exact: true }).click();
  const search = page.getByPlaceholder('Search equation, ID, formula...');
  for (const [programId, direction] of [['mgcl2_naoh', -1], ['cuso4_naoh', 1], ['agcl_nh3', -1], ['fecl3_ki', -1]]) {
    await search.fill(programId);
    await page.getByText(programId, { exact: true }).click();
    await page.getByText('ΔH° tham chiếu:', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Run Program', exact: true }).click();
    const sample = await page.evaluate(async ({ id, programId }) => {
      const { useAppStore: store } = await import('/src/store/useAppStore.ts');
      const s = store.getState(), before = s.vessels[id];
      const active = s.activeKinetics[id]?.program?.id;
      if (active !== programId) throw new Error(`UI did not start ${programId}: ${s.globalWarning}`);
      if (!s.seekStudioProgram(id, 0.65)) throw new Error(`Cannot seek ${programId}`);
      const after = store.getState().vessels[id];
      return { programId, initialTemperature_c: before.temperature_c, finalTemperature_c: after.temperature_c,
        appliedHeat_J: after.programHeatApplied_J, initialMass_g: before.mass_g, finalMass_g: after.mass_g,
        progress: store.getState().activeKinetics[id]?.progress,
        color: after.liquidColor, hasPrecipitate: after.hasPrecipitate };
    }, { id, programId });
    assert(direction * (sample.finalTemperature_c - sample.initialTemperature_c) > 0, `${programId}: wrong temperature direction`);
    assert(direction * sample.appliedHeat_J > 0, `${programId}: wrong heat direction`);
    assert(Math.abs(sample.initialMass_g - sample.finalMass_g) < 1e-7, `${programId}: lost non-gaseous sample mass`);
    report.samples.push(sample);
    await page.getByText('ΔH° tham chiếu:', { exact: true }).scrollIntoViewIfNeeded();
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(output, `${programId}.png`) });
    await page.evaluate(async () => {
      (await import('/src/store/useAppStore.ts')).useAppStore.setState({ activeKinetics: {} });
    });
  }
  await search.fill('cocl2_hcl');
  await page.getByText('cocl2_hcl', { exact: true }).click();
  await page.getByText('ΔH ước tính:', { exact: true }).waitFor();
  report.legacyEstimateLabelVisible = true;
  await page.getByText('ΔH ước tính:', { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: path.join(output, 'legacy-estimate-label.png') });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
