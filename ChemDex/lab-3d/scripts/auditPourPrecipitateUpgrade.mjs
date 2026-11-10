import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6772';
const output = 'artifacts/pour-precipitate-upgrade';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    const s = useAppStore.getState();
    s.resetWorkbench(); s.setLanguage('vi');
    await useAppStore.getState().mixSubstances('beaker_1', 'H2O', 50);
    useAppStore.setState({ selectedVesselId: 'beaker_1', nearestPourTargetId: 'flask_1', isSimulationPaused: true });
  });
  await page.getByText('Giữ để rót', { exact: true }).waitFor();
  await page.keyboard.press('q');
  let state = await page.evaluate(async () => {
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    return PourController.getSession();
  });
  assert.equal(state.targetTilt, 0.2, 'Q must be handled once, not by two listeners');
  await page.keyboard.press('q');
  state = await page.evaluate(async () => {
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    return PourController.getSession();
  });
  assert.equal(state.targetTilt, 0.28);
  await page.keyboard.down('Space');
  await page.keyboard.up('Space');
  const stopped = await page.evaluate(async () => {
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    return PourController.getSession();
  });
  assert.equal(stopped.phase, 'returning');
  await page.evaluate(async () => {
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    useAppStore.setState({ isSimulationPaused: false });
    for (let i = 0; i < 400; i++) PourController.tick(1 / 60);
    useAppStore.setState({ isSimulationPaused: true });
  });
  const button = page.getByRole('button', { name: 'Giữ để rót', exact: true });
  const box = await button.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(20, 20);
  await page.mouse.up();
  const pointer = await page.evaluate(async () => {
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    return PourController.getSession();
  });
  assert.equal(pointer.phase, 'returning', 'Release outside the button must stop its captured gesture');
  const solids = await page.evaluate(async () => {
    const { PrecipitationSystem } = await import('/src/simulation/effects/PrecipitationSystem.ts');
    const results = [];
    for (const formula of ['BaSO4', 'Cu(OH)2', 'Fe(OH)3']) {
      const system = new PrecipitationSystem(80, formula);
      for (let i = 0; i < 100; i++) system.update(0.05, { substance: formula, temp_c: 25,
        density_g_ml: 1, viscosity_mPa_s: 1, radius: 0.8, liquidBottomY: 0, surfaceY: 1,
        volume_ml: 50, precipitateAmount_g: 0.1 });
      results.push({ formula, bed_g: system.sedimentBed.amount_g, mass_g: system.representedMass_g, cloudiness: system.cloudiness });
    }
    return results;
  });
  for (const s of solids) { assert.ok(s.bed_g < 0.001); assert.ok(Math.abs(s.mass_g - 0.1) < 1e-9); }
  await page.screenshot({ path: `${output}/pour-controls.png` });
  await page.getByRole('button', { name: /^bài học$/i }).click();
  await page.getByRole('textbox', { name: 'Tìm phản ứng', exact: true }).fill('H2O2');
  await page.getByText('H2O2', { exact: true }).click();
  const guide = page.getByRole('complementary', { name: 'Diễn biến theo thời gian' });
  await guide.waitFor();
  assert.ok((await guide.innerText()).includes('không phải kết tủa mới'));
  await guide.scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${output}/reaction-guide.png` });
  const report = { keyboardHandledOnce: true, spaceStopsDuringLift: true, pointerReleasedOutside: true,
    reactionGuideVisible: true, solids, errors };
  writeFileSync(`${output}/browser.json`, JSON.stringify(report, null, 2) + '\n');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
