import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_PRACTICE_ORIGIN ?? 'http://127.0.0.1:6787';
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  await page.goto(`${origin}/lab/`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 45000 });

  const catalog = page.locator('#lab-left-panel');
  const toggle = page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true });
  const lessons = catalog.getByRole('button', { name: 'Bài học', exact: true });
  const next = catalog.getByRole('button', { name: 'Bước tiếp', exact: true });
  const previous = catalog.getByRole('button', { name: 'Trước', exact: true });
  const confirmation = catalog.getByRole('checkbox', { name: 'Tự xác nhận đã thực hiện bước này' });
  const summary = catalog.getByRole('button', { name: 'Xem phiếu tự thực hành' });
  const dialog = page.getByRole('dialog', { name: 'Phiếu tự thực hành' });
  const close = dialog.getByRole('button', { name: 'Đóng phiếu tự thực hành' });

  await toggle.tap();
  await lessons.tap();
  await catalog.getByRole('button', { name: 'Thi thử', exact: true }).tap();
  await catalog.getByText(/Kiểm chứng Định luật Bảo toàn Khối lượng \(BaCl2 \+ Na2SO4\)/).tap();
  await expect(catalog.getByText('Tự thực hành', { exact: true })).toBeVisible();
  await expect(catalog.getByText('Hợp lệ', { exact: true })).toHaveCount(0);
  await expect(confirmation).not.toBeChecked();
  await next.tap();
  await summary.tap();
  await expect(dialog.getByText('0 / 2', { exact: true })).toBeVisible();
  await expect(dialog.getByText('Điểm Tổng Kết')).toHaveCount(0);
  await close.tap();

  await previous.tap();
  await confirmation.tap();
  await expect(catalog.getByText('Đã tự xác nhận', { exact: true })).toBeVisible();
  await catalog.getByRole('button', { name: /Số lượng nguyên tử được bảo toàn/ }).tap();
  await toggle.tap();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.tap();
  await expect(confirmation).toBeChecked();
  await next.tap();
  await expect(confirmation).not.toBeChecked();
  await summary.tap();
  await expect(dialog.getByText('1 / 2', { exact: true })).toBeVisible();
  await expect(dialog.getByText('1 / 1', { exact: true })).toBeVisible();

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Xuất JSON' }).tap(),
  ]);
  assert.equal(download.suggestedFilename(), 'chemdex-practice-mass_conservation_bacl2_na2so4.json');
  const json = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(json.kind, 'practice');
  assert.equal(json.mode, 'exam');
  assert.equal(Object.hasOwn(json, 'score'), false);
  assert.equal(Object.hasOwn(json, 'letterGrade'), false);
  assert.deepEqual(json.procedure.steps, [
    { stepNumber: 1, status: 'acknowledged' }, { stepNumber: 2, status: 'unacknowledged' },
  ]);
  assert.deepEqual(json.quiz, { correct: 1, total: 1 });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);

  await previous.tap();
  await confirmation.tap();
  await expect(confirmation).not.toBeChecked();
  await confirmation.tap();
  await catalog.getByRole('button', { name: 'Tự động bày bàn thí nghiệm' }).tap();
  await expect(confirmation).not.toBeChecked();
  await next.tap();
  await summary.tap();
  await expect(dialog.getByText('0 / 2', { exact: true })).toBeVisible();
  await expect(dialog.getByText('0 / 1', { exact: true })).toBeVisible();
  await close.tap();

  await toggle.tap();
  await page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true }).tap();
  const instruments = page.getByRole('complementary', { name: 'Điều khiển dụng cụ' });
  await instruments.getByLabel('Chọn dụng cụ').selectOption('balance');
  const balanceReading = instruments.getByLabel('Số đọc Cân điện tử');
  await expect(instruments.getByText('Beaker 1 (BaCl2 on Balance)', { exact: true }).last()).toBeVisible();
  const grossMass = await balanceReading.textContent();
  assert.ok(Number(grossMass) > 85, `Expected the loaded pan to read above the vessel tare, got ${grossMass}`);
  await instruments.getByRole('button', { name: 'TARE', exact: true }).tap();
  await expect(balanceReading).toHaveText('0.000');
  await instruments.getByLabel('Bình thao tác').selectOption('beaker_2');
  await instruments.getByRole('button', { name: 'Đặt lên cân', exact: true }).tap();
  await expect(instruments.getByText('Vị trí đã có bình khác; di chuyển bình đó trước.')).toBeVisible();
  await instruments.getByRole('button', { name: 'Bỏ trừ bì', exact: true }).tap();
  await expect(balanceReading).toHaveText(grossMass);
  assert.deepEqual(errors, []);
  console.log(`PASS production Chrome 390 px: practice summary, JSON and reset; balance ${grossMass} g, TARE and occupied pan.`);
} finally {
  await browser.close();
}
