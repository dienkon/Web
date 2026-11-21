import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_AGCL_ORIGIN ?? 'http://127.0.0.1:6787';
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
  const catalogToggle = page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true });
  const inspectorToggle = page.getByRole('button', { name: 'Thông tin bình và phản ứng', exact: true });
  const next = catalog.getByRole('button', { name: 'Bước tiếp', exact: true });
  const grade = catalog.getByRole('button', { name: 'Hoàn tất & Chấm điểm' });
  const report = page.getByRole('dialog', { name: 'Báo Cáo Điểm Thi Thực Hành' });
  await catalogToggle.tap();
  await catalog.getByRole('button', { name: 'Bài học', exact: true }).tap();
  await catalog.getByRole('button', { name: 'Thi thử', exact: true }).tap();
  await catalog.getByText(/Kết tủa Dạng Vón Bã Đậu.*\(AgNO3 \+ NaCl\)/).tap();
  await expect(next).toBeDisabled();
  await catalog.getByRole('button', { name: 'Tự động bày bàn thí nghiệm' }).tap();
  await expect(next).toBeEnabled();
  await next.tap();
  await expect(next).toBeDisabled();
  await catalog.getByRole('button', { name: 'Rót từ ống đong vào cốc', exact: true }).tap();
  await expect(next).toBeEnabled({ timeout: 60000 });
  await next.tap();
  await grade.tap();
  await expect(report.getByText('27 / 40', { exact: true })).toBeVisible();
  await expect(report.getByText('0.00 s', { exact: true })).toBeVisible();
  await report.getByRole('button', { name: 'Đóng báo cáo điểm' }).tap();

  await catalog.getByRole('button', { name: 'Khuấy mẫu AgCl', exact: true }).tap();
  await expect(catalog.getByText('Hợp lệ', { exact: true })).toBeVisible({ timeout: 30000 });
  await catalog.getByRole('button', { name: 'Dừng khuấy', exact: true }).tap();
  await grade.tap();
  await expect(report.getByText('40 / 40', { exact: true })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    report.getByRole('button', { name: 'Xuất JSON' }).tap(),
  ]);
  const json = JSON.parse(await readFile(await download.path(), 'utf8'));
  const metrics = json.quantitativeMetrics;
  assert.equal(json.experimentId, 'agcl_curdy_precipitation');
  assert.equal(json.procedureScore, 40);
  assert.ok(Math.abs(metrics.agclReceived_ml - 25) <= .25, JSON.stringify(metrics));
  assert.ok(metrics.agclPrecipitate_g >= .34 && metrics.agclPrecipitate_g <= .36, JSON.stringify(metrics));
  assert.equal(metrics.agclStirred_s, 1);

  await page.goto(`${origin}/lab/?experiment=acid_base_titration`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 45000 });
  if (await inspectorToggle.getAttribute('aria-expanded') === 'false') await inspectorToggle.tap();
  const inspector = page.locator('#lab-right-panel');
  await inspector.getByRole('button', { name: 'Thông tin bình', exact: true }).tap();
  await expect(inspector.getByText(/Nồng độ mẫu.*0,1\s+mol\/L/)).toBeVisible();
  await expect(inspector.getByText(/Kho\s+·.*1\s*M\)/)).toBeVisible();
  assert.deepEqual(errors, []);
  console.log('PASS production Chrome 390 px: AgCl pour, actual immersed stirring, report JSON and separate 0.1 M sample readout.');
} finally {
  await browser.close();
}
