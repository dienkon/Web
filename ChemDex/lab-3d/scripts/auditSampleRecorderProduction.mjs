import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_RECORDER_ORIGIN ?? 'http://127.0.0.1:6792';
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  await page.goto(origin + '/lab/');
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 60000 });

  const instrumentButton = page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true });
  const instrumentPanel = page.getByRole('complementary', { name: 'Điều khiển dụng cụ', exact: true });
  const log = instrumentPanel.getByRole('region', { name: 'Nhật ký số đo', exact: true });
  const start = log.getByRole('button', { name: 'Bắt đầu ghi', exact: true });
  const logStatus = log.getByRole('status', { name: '', exact: true });
  const workingVessel = instrumentPanel.getByRole('combobox', { name: 'Bình thao tác' });
  const pause = page.getByRole('button', { name: 'Tạm dừng phản ứng', exact: true });
  const resume = page.getByRole('button', { name: 'Tiếp tục phản ứng', exact: true });
  const readingCount = async () => Number.parseInt(await log.getByText(/^\d+ mốc đo ·/).textContent(), 10);
  async function openLog() {
    await instrumentButton.click();
    await instrumentPanel.getByRole('button', { name: 'Nhật ký số đo', exact: true }).click();
    await expect(log).toBeVisible();
  }

  await pause.click();
  await openLog();
  await workingVessel.selectOption('');
  await expect(start).toBeDisabled();
  await workingVessel.selectOption('beaker_1');
  await start.click();
  await expect(logStatus).toHaveText(/Beaker 1.*Mô phỏng đang tạm dừng/);
  await log.getByLabel('Đại lượng trên đồ thị').selectOption('ph');
  await expect(log.getByText('Chưa có số đo hợp lệ cho đại lượng này.')).toBeVisible();
  await log.getByLabel('Đại lượng trên đồ thị').selectOption('temperature_c');
  await expect(logStatus).toHaveText(/Mô phỏng đang tạm dừng/);
  assert.equal(await readingCount(), 1);

  await workingVessel.selectOption('flask_1');
  await page.getByLabel('Tốc độ mô phỏng').selectOption('5');
  await resume.click();
  await expect.poll(readingCount, { timeout: 60000 }).toBeGreaterThanOrEqual(3);
  await expect(log.getByRole('application')).toBeVisible();
  await expect(log.locator('.recharts-line-curve')).toHaveAttribute('d', /^M.*L/);
  await pause.click();
  await expect(logStatus).toHaveText(/Beaker 1.*Mô phỏng đang tạm dừng/);
  const count = await readingCount();
  await instrumentPanel.getByRole('button', { name: 'Đóng bảng dụng cụ' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await openLog();
  assert.equal(await readingCount(), count);
  const fits = await instrumentPanel.evaluate(el => {
    const rect = el.getBoundingClientRect();
    return rect.left >= 0 && rect.right <= innerWidth && el.scrollWidth <= el.clientWidth;
  });
  assert.ok(fits, 'The sample log must fit the mobile viewport');

  await log.getByRole('button', { name: 'Dừng ghi' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download'), log.getByRole('button', { name: 'Tải CSV' }).click(),
  ]);
  const csv = await readFile(await download.path(), 'utf8');
  const [header, ...rows] = csv.trim().split('\r\n');
  assert.match(header, /simulation_time_s,pH,temperature_c,liquid_volume_ml,sample_mass_g/);
  assert.equal(rows.length, count);
  const readings = rows.map(row => row.split(','));
  assert.equal(Number(readings[0][2]), 0);
  assert.ok(readings.every((row, i) => row[0] === '"beaker_1"' && row[3] === ''
    && (i === 0 || Number(row[2]) > Number(readings[i - 1][2]))));

  await log.getByRole('button', { name: 'Ghim làm đối chứng', exact: true }).click();
  await expect(log.getByText(/Đối chứng · Beaker 1/)).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 850 });
  await instrumentPanel.getByRole('button', { name: 'Đóng bảng dụng cụ' }).click();
  await page.getByTitle('Gia nhiệt (+35°C)', { exact: true }).click();
  await openLog();
  await log.getByRole('button', { name: 'Bắt đầu lượt so sánh', exact: true }).click();
  await expect(logStatus).toHaveText(/Flask 1.*Mô phỏng đang tạm dừng/);
  await expect(log.getByRole('status', { name: 'Số đo mới nhất' })).toHaveText('60 °C');
  await resume.click();
  await expect.poll(readingCount, { timeout: 60000 }).toBeGreaterThanOrEqual(3);
  const lines = log.locator('.recharts-line-curve');
  await expect(lines).toHaveCount(2);
  await expect(log.locator('.recharts-line-curve[stroke-dasharray]')).toHaveAttribute('d', /^M.*L/);
  await pause.click();
  const comparisonCount = await readingCount();
  const [referenceDownload] = await Promise.all([
    page.waitForEvent('download'), log.getByRole('button', { name: 'Tải CSV đối chứng', exact: true }).click(),
  ]);
  assert.equal(await readFile(await referenceDownload.path(), 'utf8'), csv);
  await page.reload();
  await openLog();
  await expect(logStatus).toHaveText(/Flask 1.*Đã dừng ghi/);
  await expect(log.getByText(/Đối chứng · Beaker 1/)).toBeVisible();
  assert.equal(await readingCount(), comparisonCount);
  await expect(lines).toHaveCount(2);
  await instrumentPanel.getByRole('button', { name: 'Đóng bảng dụng cụ' }).click();
  await page.getByRole('button', { name: 'Thiết lập bàn thí nghiệm', exact: true }).click();
  await page.getByRole('button', { name: 'Báo cáo thực hành', exact: true }).click();
  const notes = page.getByPlaceholder(/^Mô tả chi tiết/);
  const insert = page.getByRole('button', { name: 'Chèn nhật ký số đo', exact: true });
  await notes.fill('Ghi chú quan sát của học sinh.');
  await insert.click();
  await expect(notes).toHaveValue(/Ghi chú quan sát của học sinh\.[\s\S]*Nhật ký đối chứng · Beaker 1[\s\S]*Nhật ký số đo · Flask 1[\s\S]*60 ở 0 s/);
  await expect(notes).toHaveValue(/pH · chưa có số đo hợp lệ/);
  await expect(insert).toBeDisabled();
  await page.getByRole('button', { name: 'Đồng bộ từ bàn thí nghiệm', exact: true }).click();
  assert.ok(!(await notes.inputValue()).includes('pH mô hình ='), 'A dry vessel has no model pH reading');
  await page.getByRole('button', { name: 'Đóng', exact: true }).click();

  await openLog();
  await log.getByRole('button', { name: 'Bỏ đối chứng', exact: true }).click();
  await expect(lines).toHaveCount(1);
  assert.equal(await readingCount(), comparisonCount);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ readings: count, pauseVerified: true, selectedVesselUnchangedInCSV: true,
    mobileWidth: 390, missingPhExportedAsBlank: true, comparisonTraces: 2,
    pinnedCSVUnchanged: true, reportSummaryPreservesNotes: true, reloadedRunsStoppedAndIntact: true, runtimeErrors: errors }));
} finally {
  await browser.close();
}
