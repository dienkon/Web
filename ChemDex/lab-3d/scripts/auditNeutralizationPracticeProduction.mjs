import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_NEUTRALIZATION_ORIGIN ?? 'http://127.0.0.1:6787';
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  await page.goto(`${origin}/lab/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 45000 });

  const catalog = page.locator('#lab-left-panel');
  const next = catalog.getByRole('button', { name: 'Bước tiếp', exact: true });
  const grade = catalog.getByRole('button', { name: 'Hoàn tất & Chấm điểm' });
  const report = page.getByRole('dialog', { name: 'Báo Cáo Điểm Thi Thực Hành' });
  await page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true }).tap();
  await catalog.getByRole('button', { name: 'Bài học', exact: true }).tap();
  await catalog.getByRole('button', { name: 'Thi thử', exact: true }).tap();
  await catalog.getByText(/Nhiệt Hóa Học: Hiệu Ứng Nhiệt Phản Ứng Trung Hòa.*HCl \+ NaOH/).tap();
  await expect(next).toBeDisabled();
  await catalog.getByRole('button', { name: 'Tự động bày bàn thí nghiệm' }).tap();
  const recordTemperature = catalog.getByRole('button', { name: 'Ghi nhiệt độ ban đầu', exact: true });
  await expect(recordTemperature).toBeDisabled();
  await catalog.getByRole('button', { name: 'Đặt nhiệt kế vào cốc', exact: true }).tap();
  await expect(recordTemperature).toBeEnabled({ timeout: 45000 });
  await recordTemperature.tap();
  await expect(next).toBeEnabled();
  await next.tap();
  await expect(next).toBeDisabled();
  await expect(catalog.getByText(/Nhiệt kế hiện tại.*25\.0 °C/)).toBeVisible();
  await catalog.getByRole('button', { name: 'Rót NaOH vào cốc HCl', exact: true }).tap();
  await expect(next).toBeEnabled({ timeout: 45000 });
  await expect(catalog.getByText(/Độ tăng nhiệt của mẫu.*12[.,]\d+ °C/)).toBeVisible();
  await next.tap();
  await grade.tap();
  await expect(report.getByText('27 / 40', { exact: true })).toBeVisible();
  await report.getByRole('button', { name: 'Đóng báo cáo điểm' }).tap();

  const recordPh = catalog.getByRole('button', { name: 'Ghi pH', exact: true });
  await expect(recordPh).toBeDisabled();
  await catalog.getByRole('button', { name: 'Đặt đầu dò pH vào cốc', exact: true }).tap();
  await expect(recordPh).toBeEnabled({ timeout: 45000 });
  await recordPh.tap();
  await expect(catalog.getByText('Hợp lệ', { exact: true })).toBeVisible();
  await grade.tap();
  await expect(report.getByText('40 / 40', { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    report.getByRole('button', { name: 'Xuất JSON' }).tap(),
  ]);
  const json = JSON.parse(await readFile(await download.path(), 'utf8'));
  const m = json.quantitativeMetrics;
  assert.equal(json.experimentId, 'exothermic_neutralization');
  assert.equal(json.procedureScore, 40);
  assert.ok(Math.abs(m.neutralizationInitial_c - 25) <= .15, JSON.stringify(m));
  assert.ok(Math.abs(m.neutralizationReceived_ml - 40) <= .25, JSON.stringify(m));
  assert.ok(m.neutralizationPeak_c > 36.8 && m.neutralizationPeak_c < 37.5, JSON.stringify(m));
  assert.ok(Math.abs(m.finalPh - m.neutralizationNeutralPh) <= .02 && m.finalPh < 6.9, JSON.stringify(m));
  assert.deepEqual(errors, []);
  console.log(`PASS production Chrome 390 px: before-and-after probes, ${m.neutralizationReceived_ml.toFixed(2)} mL received, ΔT ${m.neutralizationRise_c.toFixed(2)} °C and pH ${m.finalPh.toFixed(2)}.`);
} finally {
  await browser.close();
}
