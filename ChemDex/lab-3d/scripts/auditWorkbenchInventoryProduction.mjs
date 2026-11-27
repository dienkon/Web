import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_INVENTORY_ORIGIN ?? 'http://127.0.0.1:6792';
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  await page.goto(origin + '/lab/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 60000 });
  const toolbar = page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true });
  const panel = page.getByRole('complementary', { name: 'Điều khiển dụng cụ', exact: true });
  const inventory = panel.getByRole('region', { name: 'Theo dõi khối lượng', exact: true });
  const inventoryTab = panel.getByRole('button', { name: 'Khối lượng', exact: true });
  const toolTab = panel.getByRole('button', { name: 'Dụng cụ', exact: true });
  const mass = name => inventory.getByRole('row').filter({
    has: page.getByRole('rowheader', { name, exact: true }),
  }).getByRole('cell');

  await toolbar.click();
  await inventoryTab.click();
  await expect(mass('Trong buret')).toHaveText(['50,000']);
  await inventory.getByRole('button', { name: 'Đặt mốc so sánh', exact: true }).click();
  await expect(mass('Tổng ghi nhận trên bàn')).toHaveText(['50,000', '0,000']);

  await toolTab.click();
  await panel.getByLabel('Chọn dụng cụ').selectOption('burette');
  await panel.getByLabel('Bình thao tác').selectOption('beaker_1');
  await panel.getByRole('button', { name: 'Căn bình dưới buret', exact: true }).click();
  await panel.getByRole('button', { name: 'Nhả một giọt', exact: true }).click();
  await inventoryTab.click();
  await expect(mass('Trong bình')).toHaveText(['0,050', '+0,050']);
  await expect(mass('Trong buret')).toHaveText(['49,950', '-0,050']);
  await expect(mass('Tổng ghi nhận trên bàn')).toHaveText(['50,000', '0,000']);
  await inventory.getByText('Theo từng bình, gồm cả nước ngưng', { exact: true }).click();
  await expect(inventory.getByRole('listitem')).toHaveText(/Beaker 1.*0,050 g/);
  const [download] = await Promise.all([
    page.waitForEvent('download'), inventory.getByRole('button', { name: 'Tải CSV', exact: true }).click(),
  ]);
  const csv = await readFile(await download.path(), 'utf8');
  const rows = csv.trim().split('\r\n');
  const [, burette_g, delta_g] = rows.find(row => row.startsWith('"burette",')).split(',').map(Number);
  assert.ok(Math.abs(burette_g - 49.95) < 1e-6 && Math.abs(delta_g + 0.05) < 1e-6);

  await panel.getByRole('button', { name: 'Đóng bảng dụng cụ', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await toolbar.click();
  await inventoryTab.click();
  await expect(mass('Trong buret')).toHaveText(['49,950', '-0,050']);
  assert.ok(await inventory.evaluate(region => region.scrollWidth <= region.clientWidth), 'The inventory must fit the mobile panel');
  await panel.getByRole('button', { name: 'Đóng bảng dụng cụ', exact: true }).click();
  await page.getByRole('button', { name: 'Thiết lập bàn thí nghiệm', exact: true }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Đặt lại bàn thí nghiệm', exact: true }).click();
  await toolbar.click();
  await inventoryTab.click();
  await expect(inventory.getByRole('status')).toHaveText(/Bàn đã đổi trạng thái/);
  await expect(mass('Trong buret')).toHaveText(['50,000']);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ delivered_g: 0.05, subtotal_g: 50,
    csvMassAndDeltaVerified: true, baselineSurvivedPanelClose: true,
    resetInvalidatedBaseline: true, mobileWidth: 390, runtimeErrors: errors }));
} finally {
  await browser.close();
}
