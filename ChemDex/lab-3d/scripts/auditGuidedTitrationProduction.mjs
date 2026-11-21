import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_TITRATION_ORIGIN ?? 'http://127.0.0.1:6787';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  await page.goto(`${origin}/lab/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 45000 });

  const catalogToggle = page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true });
  const catalog = page.locator('#lab-left-panel');
  const next = catalog.getByRole('button', { name: 'Bước tiếp', exact: true });
  await catalogToggle.tap();
  await catalog.getByRole('button', { name: 'Bài học', exact: true }).tap();
  await catalog.getByRole('button', { name: 'Thi thử', exact: true }).tap();
  await catalog.getByText('Chuẩn độ Axit - Bazơ (HCl + NaOH)', { exact: true }).tap();
  await expect(next).toBeDisabled();
  await catalog.getByRole('button', { name: 'Tự động bày bàn thí nghiệm' }).tap();
  await expect(next).toBeEnabled();
  await next.tap();
  await expect(next).toBeDisabled();
  await catalog.getByRole('button', { name: 'Thêm phenolphthalein', exact: true }).tap();
  await expect(next).toBeEnabled();
  await next.tap();
  await catalog.getByRole('button', { name: /Không màu/ }).tap();
  await catalog.getByRole('button', { name: 'Căn bình và mở bảng chuẩn độ' }).tap();

  const station = page.getByRole('region', { name: 'Trạm chuẩn độ', exact: true });
  await expect(station.locator('[data-burette-receiver="flask_1"]')).toBeVisible();
  const volume = station.getByText(/NaOH đã vào bình trong bài này/).locator('strong');
  await expect(volume).toHaveText('0.00 / 20.00 mL');
  await expect(station.getByText('50.00 / 50 mL', { exact: true })).toBeVisible();
  await page.getByLabel('Tốc độ mô phỏng').selectOption('5');

  // Stop the existing valve by its rendered reading, as a user does. This
  // avoids relying on frame rate or on an internal store in production.
  await station.evaluate(element => {
    const readVolume = () => element.querySelector('p strong.font-mono');
    const watch = new MutationObserver(() => {
      if (!(Number.parseFloat(readVolume()?.textContent ?? '') >= 19.6)) return;
      const stop = [...element.querySelectorAll('button')].find(button => button.textContent.trim() === 'Dừng rót');
      if (stop) { watch.disconnect(); stop.click(); }
    });
    watch.observe(element, { subtree: true, childList: true, characterData: true });
  });
  const continuous = station.getByRole('button', { name: 'Rót liên tục', exact: true });
  await continuous.tap();
  await expect(station.getByRole('button', { name: 'Dừng rót', exact: true })).toBeVisible();
  await expect(continuous).toBeVisible({ timeout: 90000 });

  const dose = station.getByRole('button', { name: 'Nhả một giọt từ buret', exact: true });
  const readVolume = async () => Number.parseFloat(await volume.textContent());
  let delivered = await readVolume();
  assert.ok(delivered >= 19.6 && delivered < 20, `Stopped at ${delivered} mL`);
  while (delivered < 20) {
    const afterDrop = delivered + .05;
    await dose.tap();
    await expect.poll(readVolume).toBeCloseTo(afterDrop, 2);
    delivered = await readVolume();
  }
  await expect(volume).toHaveText('20.00 / 20.00 mL');
  await station.getByRole('button', { name: 'Xóa lượt đang xem' }).tap();
  await expect(volume).toHaveText('20.00 / 20.00 mL');
  await catalogToggle.tap();
  await expect(catalog.getByText('Hợp lệ', { exact: true })).toBeVisible();
  await catalog.getByRole('button', { name: 'Hoàn tất & Chấm điểm' }).tap();

  const report = page.getByRole('dialog', { name: 'Báo Cáo Điểm Thi Thực Hành' });
  await expect(report.getByText('20.00 / 20.00 mL', { exact: true })).toBeVisible();
  await expect(report.getByText('40 / 40', { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    report.getByRole('button', { name: 'Xuất JSON' }).tap(),
  ]);
  const json = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(json.mode, 'exam');
  assert.equal(json.procedureScore, 40);
  assert.equal(json.quizScore, 20);
  assert.ok(json.durationSeconds > 0, 'the exam timer must survive switching panels');
  assert.deepEqual([
    json.quantitativeMetrics.titrationDelivered_ml,
    json.quantitativeMetrics.titrationTarget_ml,
    json.quantitativeMetrics.titrationError_ml,
    json.quantitativeMetrics.titrationOtherTitrant_ml,
  ], [20, 20, 0, 0]);
  assert.ok(Math.abs(json.quantitativeMetrics.finalPh - 7) < 0.1, JSON.stringify(json.quantitativeMetrics));
  assert.deepEqual(errors, []);
  console.log('PASS production Chrome 390 px: prepared sample, indicator, one 20 mL titration, grade and JSON after clearing the graph.');
} finally {
  await browser.close();
}
