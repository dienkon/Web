import { test, expect } from '@playwright/test';

test('missing Vercel backend setup displays actionable popup instead of a generic 503', async ({ page }) => {
  await page.route('**/api/config', route => route.fulfill({ json: {
    configured: false, serverUrl: null, code: 'BACKEND_NOT_CONFIGURED',
    message: 'Chủ website cần đặt REALTIME_SERVER_URL trong Vercel. Không cần key trả phí để tạo phòng.',
  } }));
  let created = false;
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/api/rooms')) created = true; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tạo cuộc họp', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Không thể tạo phòng' })).toContainText('REALTIME_SERVER_URL');
  expect(created).toBe(false);
});

test('Vercel runtime discovery waits for a sleeping free backend and creates a room once', async ({ page }) => {
  await page.route('**/api/config', route => route.fulfill({ json: { configured: true, serverUrl: 'http://localhost:5000' } }));
  let healthRequests = 0, creations = 0;
  await page.route('http://localhost:5000/api/health', route => {
    healthRequests++;
    return healthRequests === 1 ? route.fulfill({ status: 503, body: '<html>Starting</html>' }) : route.fulfill({ json: { status: 'ok' } });
  });
  page.on('request', req => { if (req.method() === 'POST' && req.url().endsWith('/api/rooms')) creations++; });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tạo cuộc họp', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Đang kết nối máy chủ…', exact: true })).toBeDisabled();
  await expect(page.getByRole('dialog', { name: 'Phòng học đã được tạo' })).toBeVisible();
  expect(healthRequests).toBe(2); expect(creations).toBe(1);
  await page.getByRole('button', { name: 'Bắt đầu phòng', exact: true }).click();
  await page.getByPlaceholder('Nguyễn Văn A').fill('Người tạo trên Vercel');
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
});
