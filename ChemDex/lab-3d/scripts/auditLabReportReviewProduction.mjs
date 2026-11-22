import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_REPORT_REVIEW_ORIGIN ?? 'http://127.0.0.1:6792';
const endpoint = '/api/experiment/report-review';
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'potato'));
  const invalidRequest = await page.request.post(origin + endpoint, { data: { lang: 'vi', report: {} } });
  assert.equal(invalidRequest.status(), 400);
  assert.deepEqual(await invalidRequest.json(), { error: 'invalid_report' });

  let releaseDelayed;
  const delayed = new Promise(resolve => { releaseDelayed = resolve; });
  const requests = [];
  const valid = { score: 7.25, pros: ['Có số đọc nhiệt độ.'], improvements: ['Ghi thời điểm đo.'], summary: 'Bổ sung mốc thời gian.' };
  await page.route('**/api/experiment/**', async route => {
    if (new URL(route.request().url()).pathname !== endpoint) return route.abort();
    requests.push(route.request().postDataJSON());
    if (requests.length === 1) return route.fulfill({ status: 503, json: { error: 'review_unavailable' } });
    if (requests.length === 2) return route.fulfill({ json: { ...valid, score: 11 } });
    if (requests.length === 3) {
      await delayed;
      return route.fulfill({ json: { ...valid, score: 9.75 } }).catch(() => {});
    }
    return route.fulfill({ json: valid });
  });

  await page.goto(origin + '/lab/');
  await page.getByRole('button', { name: 'Thiết lập bàn thí nghiệm', exact: true }).click();
  await page.getByRole('button', { name: 'Báo cáo thực hành', exact: true }).click();
  const grade = page.getByRole('button', { name: 'Nhờ Trợ Giảng Chấm Bài', exact: true });
  const observation = page.getByPlaceholder(/^Mô tả chi tiết/);
  const score = page.getByText(/\/ 10 Điểm$/);
  const draft = 'Nhiệt độ tăng từ 22 lên 28 °C.';
  await grade.click();
  await expect(page.getByRole('alert')).toHaveText(/Nhập hiện tượng/);
  assert.equal(requests.length, 0);

  await observation.fill(draft);
  for (const expectedCalls of [1, 2]) {
    await grade.click();
    await expect(page.getByRole('alert')).toHaveText(/Chưa thể chấm bằng AI/);
    await expect(observation).toHaveValue(draft);
    await expect(score).toHaveCount(0);
    assert.equal(requests.length, expectedCalls);
  }
  await grade.click();
  await expect.poll(() => requests.length).toBe(3);
  await expect(page.getByRole('button', { name: 'Đang chấm điểm...' })).toBeDisabled();
  await observation.fill(draft + ' Đã thay bản nháp.');
  await expect(grade).toBeEnabled();
  await observation.fill(draft);
  await expect(grade).toBeEnabled();
  releaseDelayed();
  await grade.click();
  await expect(score).toHaveText('7.25 / 10 Điểm');
  await expect(page.getByText(valid.summary, { exact: true })).toBeVisible();
  assert.equal(requests.length, 4);
  assert.equal(requests[3].report.observations, draft);
  assert.equal('studentName' in requests[3].report, false);
  assert.equal('className' in requests[3].report, false);
  await observation.fill('Một báo cáo khác.');
  await expect(score).toHaveCount(0);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ invalidInputRejectedByServer: true, blankDraftBlocked: true,
    networkAndSchemaFailuresWithoutGrade: true, staleGradeDiscarded: true, validGradeDisplayed: true,
    identityFieldsExcluded: true, runtimeErrors: errors }));
} finally {
  await browser.close();
}
