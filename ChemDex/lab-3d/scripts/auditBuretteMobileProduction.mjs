import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const storageKey = 'chemlab_physical_state_v4';
const origin = process.env.LAB_BURETTE_MOBILE_ORIGIN ?? 'http://127.0.0.1:6787';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));

  const instruments = page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true });
  const closeInstruments = page.getByRole('button', { name: 'Đóng bảng dụng cụ' });
  const titration = page.getByRole('region', { name: /Trạm chuẩn độ|Titration station/i });
  const dose = titration.getByRole('button', { name: /Nhả một giọt từ buret|Dispense one burette drop/ });
  async function openTitration() {
    const inspector = page.locator('button[aria-controls="lab-right-panel"]');
    if (await inspector.getAttribute('aria-expanded') === 'false') await inspector.tap();
    await page.getByRole('button', { name: /^(Chuẩn độ|Titration)$/ }).tap();
    await expect(titration).toBeVisible();
  }

  await page.goto(`${origin}/lab/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 45000 });
  await instruments.tap();
  await page.getByLabel('Bình thao tác').selectOption('flask_1');
  await closeInstruments.tap();
  await openTitration();
  await expect(dose).toBeDisabled();
  await titration.getByRole('button', { name: /Căn bình dưới buret|Align selected vessel/ }).tap();
  await expect(titration.locator('[data-burette-receiver="flask_1"]')).toBeVisible();
  // Fire the page lifecycle event in the same browser task as delivery,
  // before the idle timer could save the pending drop.
  const savedOnExit = await dose.evaluate((button, key) => {
    button.click();
    window.dispatchEvent(new Event('pagehide'));
    const state = JSON.parse(localStorage.getItem(key));
    return {
      remaining: state.materials.burette.currentVolume_ml,
      recorded: state.materials.titrationHistory.at(-1).dispensedVolume_ml,
      receiver: state.vessels.flask_1.volume_ml,
    };
  }, storageKey);
  assert.deepEqual(savedOnExit, { remaining: 49.95, recorded: .05, receiver: .05 });
  await expect(titration.getByText('49.95 / 50 mL')).toBeVisible();
  await titration.getByText(/Nạp hoặc xả buret|Fill or drain the burette/).tap();
  const fill = titration.getByRole('button', { name: /Nạp đầy từ kho|Refill from stock/ });
  await expect(async () => {
    await fill.tap();
    await expect(titration.getByText('50.00 / 50 mL')).toBeVisible({ timeout: 1500 });
  }).toPass({ timeout: 25000 });
  const bounds = await titration.evaluate(node => ({ viewport: window.innerWidth, left: node.getBoundingClientRect().left,
    right: node.getBoundingClientRect().right, scroll: node.scrollWidth, client: node.clientWidth }));
  assert.ok(bounds.left >= 0 && bounds.right <= bounds.viewport && bounds.scroll <= bounds.client + 1, JSON.stringify(bounds));

  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.materials?.burette?.currentVolume_ml === 50, storageKey);
  await page.evaluate(key => {
    const record = JSON.parse(localStorage.getItem(key));
    record.materials.burette.position = [1.25, 0, .75];
    record.materials.titrationHistory = Array.from({ length: 1000 }, (_, i) => ({
      vesselId: 'flask_1', volumeAdded_ml: i === 999 ? 50 : (i + 1) * .001,
      ph: i === 501 ? null : 3 + 8 / (1 + Math.exp((500 - i) / 20)),
      temperature_c: 25, color: '#fff', timestamp: i + 1,
    }));
    localStorage.setItem(key, JSON.stringify(record));
  }, storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await instruments.tap();
  await page.getByLabel('Chọn dụng cụ').selectOption('burette');
  await expect(page.getByLabel('Tọa độ X')).toHaveValue('1.25');
  await expect(page.getByLabel('Tọa độ Z')).toHaveValue('0.75');
  await page.getByLabel('Lưu lượng (mL/s)').fill('0.6');
  await page.waitForFunction(key => {
    const saved = JSON.parse(localStorage.getItem(key)).materials.burette;
    return saved.flowRate_ml_s === .6 && saved.position[1] === 1;
  }, storageKey);
  await page.getByLabel('Bình thao tác').selectOption('flask_1');
  await closeInstruments.tap();
  await openTitration();
  await expect(titration.getByText(/1000 (điểm|points)/)).toBeVisible();
  await expect(titration.locator('path.recharts-line-curve')).toHaveCount(1);
  await expect(titration.locator('.recharts-line-dot')).toHaveCount(0);
  const plotted = Number(await titration.locator('[data-titration-plot-count]').getAttribute('data-titration-plot-count'));
  assert.ok(plotted > 0 && plotted <= 800);
  const path = await titration.locator('path.recharts-line-curve').getAttribute('d');
  assert.ok((path.match(/M/g) ?? []).length >= 2, 'missing measurement splits the curve');
  const x = [...path.matchAll(/[ML](-?[\d.]+),/g)].map(match => Number(match[1]));
  assert.ok((x.at(-1) - x.at(-2)) / (x.at(-1) - x[0]) > .8, 'axis distances reflect actual volume');
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    titration.getByRole('button', { name: /Tải CSV chuẩn độ|Download titration CSV/ }).tap(),
  ]);
  const csv = await readFile(await download.path(), 'utf8');
  const rows = csv.trimEnd().split('\r\n');
  assert.equal(rows.length, 1001);
  assert.ok(rows.some(row => row.startsWith('"flask_1",0.502,,,25')));

  await titration.getByRole('button', { name: /Căn bình dưới buret|Align selected vessel/ }).tap();
  await expect(titration.locator('[data-burette-receiver="flask_1"]')).toBeVisible();
  await titration.getByText(/Nạp hoặc xả buret|Fill or drain the burette/).tap();
  await titration.getByLabel('Dung dịch chuẩn', { exact: true }).selectOption('hcl-005');
  const load = titration.getByRole('button', { name: 'Nạp dung dịch đã chọn' });
  await expect(load).toBeDisabled();
  await titration.getByRole('button', { name: 'Xả vào chất thải' }).tap();
  await expect(titration.getByText('0.00 / 50 mL')).toBeVisible();
  await load.tap();
  await expect(titration.getByText('HCl (dil) (0.05 M)', { exact: true })).toBeVisible();
  await dose.tap();
  await expect(titration.getByText('1 điểm', { exact: true })).toBeVisible();
  const runSelect = titration.getByLabel('Lượt chuẩn độ', { exact: true });
  await expect(runSelect).toHaveValue('-1');
  const [newDownload] = await Promise.all([
    page.waitForEvent('download'),
    titration.getByRole('button', { name: 'Tải CSV chuẩn độ' }).tap(),
  ]);
  const newRows = (await readFile(await newDownload.path(), 'utf8')).trimEnd().split('\r\n');
  assert.equal(newRows.length, 2);
  assert.match(newRows[0], /,run_id$/);
  assert.match(newRows[1], /^"flask_1",0\.05,0\.05,.*"HCl \(dil\)",0\.05,"received".*,"[^"]+"$/);
  await runSelect.selectOption({ label: '1. Số đo cũ' });
  await expect(titration.getByText('1000 điểm', { exact: true })).toBeVisible();

  await page.waitForFunction(key => JSON.parse(localStorage.getItem(key)).materials.titrationHistory.length === 1001, storageKey);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await openTitration();
  await expect(titration.getByText('HCl (dil) (0.05 M)', { exact: true })).toBeVisible();
  await expect(titration.getByText('1 điểm', { exact: true })).toBeVisible();
  await expect(titration.getByLabel('Lượt chuẩn độ', { exact: true }).locator('option')).toHaveCount(3);
  await dose.tap();
  await expect(titration.getByText('2 điểm', { exact: true })).toBeVisible();
  assert.equal(await titration.getByLabel('Lượt chuẩn độ', { exact: true }).locator('option').count(), 3);
  assert.deepEqual(errors, []);
  console.log(`PASS production Chrome 390 px: pagehide save, refill, numeric axis, pH gap, 1,000 CSV rows (${plotted} plotted points), stock replacement and independent runs across reload.`);
} finally {
  await browser.close();
}
