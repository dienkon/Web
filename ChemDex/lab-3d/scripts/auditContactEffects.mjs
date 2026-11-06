import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/contact-effects');
await mkdir(output, { recursive: true });
const report = { errors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1550, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/?vfx=1`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).waitFor({ timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, spills: {}, activeKinetics: {}, pendingReactions: {},
      inFlightPours: [], workbenchEscapedGas_g: {}, isSimulationPaused: true, timeScale: 1, pouringChemical: null,
      leftSidebarOpen: false, rightSidebarOpen: false });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], name: 'Contact audit' });
    store.getState().setSelectedVesselId(id);
    return id;
  });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).selectOption(id);
  const snapshot = async (name) => {
    const data = await page.evaluate(async id => {
      const { useAppStore: store } = await import('/src/store/useAppStore.ts');
      const s = store.getState(), v = s.vessels[id];
      return { shattered: !!v.isShattered, color: v.liquidColor, contents: v.contents, volume_ml: v.volume_ml,
        reactionId: s.activeKinetics[id]?.reactionId,
        spills: Object.values(s.spills).map(p => ({ color: p.color, volume_ml: p.volume_ml, contents: p.contents, gasRate_mol_s: p.gasRate_mol_s })),
        atmosphere: s.workbenchEscapedGas_g, flying: s.inFlightPours.length };
    }, id);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    report.phases.push({ name, ...data });
    return data;
  };
  await page.getByRole('button', { name: 'Na nhỏ · chạy ngẫu nhiên', exact: true }).click();
  await page.waitForTimeout(650);
  const small = await snapshot('01-small-sodium');
  assert.equal(small.shattered, false);
  assert(small.contents.some(c => c.formula === 'Na' && c.mass_g > 0));
  await page.getByRole('button', { name: 'Na lớn · nổ khi tiếp xúc', exact: true }).click();
  await page.waitForFunction(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    return store.getState().vessels[id]?.isShattered;
  }, id, { timeout: 15000 });
  const big = await snapshot('02-large-sodium-breakage');
  assert.equal(big.shattered, true); assert(big.spills.length > 0);
  await page.getByRole('button', { name: 'Thay bình đã vỡ', exact: true }).click();
  await page.getByRole('button', { name: 'Pha màu · rót tràn', exact: true }).click();
  await page.waitForTimeout(1700);
  const colors = await snapshot('03-color-overflow');
  assert(colors.color && colors.volume_ml > 0);
  assert.equal(colors.reactionId, undefined, 'Physical color mixing must not invent a reaction');
  assert(colors.spills.length > 0 || colors.flying > 0);
  // Let the finite wall sheet finish before replacing its source sample.
  await page.waitForFunction(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    return !store.getState().inFlightPours.some(p => p.sourceId === id || p.targetId === id);
  }, id, { timeout: 30000 });
  await page.getByRole('button', { name: 'Đổ ra bàn · sinh khí', exact: true }).click();
  await page.waitForTimeout(650);
  const gas = await snapshot('04-spill-gas');
  assert(gas.atmosphere.CO2 > 0);
  assert(gas.spills.some(s => s.gasRate_mol_s > 0), 'Products must not stop the contact reaction after its first frame');
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
