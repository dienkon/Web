import { test, expect } from '@playwright/test';

const EXPECTED_TIERS = [
  '10.000đ', '10.000đ', '10.000đ', '10.000đ', '10.000đ',
  'GEMINI PRO', 'GEMINI PRO',
  '20.000đ', '20.000đ', '20.000đ',
  'GEMINI PRO', 'GEMINI PRO',
  '10.000đ', '10.000đ', '10.000đ', '10.000đ', '10.000đ',
  '20.000đ',
  'GEMINI PRO',
  '20.000đ',
];

const EXPECTED_POOL = new Set([
  '005', '007', '010', '012', '013', '015', '017', '019', '021', '023', '024',
  '025', '026', '027', '028', '029', '030', '031', '036', '037', '044', '045',
  '057', '085', '088', '111', '116', '136', '144', '152', '159', '171', '175',
  '214', '216', '221', '235', '247', '255', '259', '271', '305', '310', '311',
  '333', '336', '345', '347', '350', '357', '360', '368', '444', '450', '499',
  '067', '500',
]);

const CLASS_12A1_CODES = new Set([
  '005', '007', '010', '013', '017', '023', '025', '027', '029', '030', '031',
  '057', '067', '111', '136', '171', '216', '221', '255', '259', '271', '311',
  '333', '357', '368', '499', '500',
]);

test.describe('Minigame 20-round VIP draw (/ket-qua-khao-sat)', () => {
  test('renders bright white layout, preserves exact 20-round schedule and 57-number pool, hides numbers before 18:00', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/ket-qua-khao-sat');
    await expect(page).toHaveTitle(/Quay Số & Kết Quả Minigame/);
    await expect(page.locator('#chemdex-sidebar')).toHaveCount(0);

    const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)');
    await expect(page.locator('body')).toContainText('QUAY SỐ MINIGAME KHẢO SÁT CHEMDEX');
    await expect(page.locator('body')).toContainText('0971431683');
    await expect(page.locator('body')).toContainText('Dương Thanh Điền');

    // Kiểm tra đúng thứ tự 20 lượt quay và đều ẩn trước 18:00
    const roundTiers = await page.locator('#rounds-grid .rt-tier').allTextContents();
    expect(roundTiers).toEqual(EXPECTED_TIERS);
    const roundNums = await page.locator('#rounds-grid .rt-num').allTextContents();
    expect(roundNums).toEqual(Array(20).fill('? ? ?'));

    // Kiểm tra pool có đủ 57 con số hợp lệ
    await page.locator('#pool-card summary').click();
    await expect(page.locator('#pool-grid .pool-item')).toHaveCount(57);

    // Responsive mobile 360px không tràn ngang
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/ket-qua-khao-sat/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow).toBe(true);
    expect(errors).toEqual([]);
  });

  test('VIP 3-drum spin sequentially locks digits with drum-3 focus, filters candidates, and allocates exact 2 Gemini / 2x20k / 8x10k winners', async ({ page }) => {
    await page.goto('/ket-qua-khao-sat/');

    await page.locator('#demo-toggle-btn').click();
    await expect(page.locator('#demo-dock')).toHaveClass(/is-open/);

    // Tăng tốc 4x để test mượt qua nhiều giai đoạn
    await page.locator('#demo-speed-btn').click(); // 2x
    await page.locator('#demo-speed-btn').click(); // 4x

    // Nhảy Lượt 6 (GEMINI PRO trượt 022) và kiểm tra Focus vào trống 3
    await page.locator('[data-preset="gemini-miss"]').click();
    await expect(page.locator('#stage-card')).toHaveClass(/is-arena/, { timeout: 6000 });
    await expect(page.locator('#stage-card')).toHaveClass(/is-focus-3/, { timeout: 6000 });
    await expect(page.locator('#drum-col-2')).toHaveClass(/is-focus/);
    await expect(page.locator('#candidate-chips')).toContainText('023');
    await expect(page.locator('#outcome-banner')).toContainText('022', { timeout: 8000 });
    await expect(page.locator('#quota-gemini')).toHaveText('0 / 2 suất');

    // Nhảy Lượt 7 (GEMINI PRO trúng 347) -> kiểm tra lọc còn 345/347 rồi trúng 347
    await page.locator('[data-preset="gemini-hit"]').click();
    await expect(page.locator('#stage-card')).toHaveClass(/is-focus-3/, { timeout: 6000 });
    await expect(page.locator('#candidate-chips')).toContainText('345');
    await expect(page.locator('#candidate-chips')).toContainText('347');
    await expect(page.locator('#outcome-banner')).toContainText('347', { timeout: 8000 });
    await expect(page.locator('#quota-gemini')).toHaveText('1 / 2 suất');

    // Nhảy tới Tổng kết 20/20 -> kiểm tra giao diện tổng kết tối ưu (.is-finale) & tra cứu nhanh
    await page.locator('[data-preset="completed"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'completed');
    await expect(page.locator('#stage-card')).toHaveClass(/is-finale/);
    await expect(page.locator('#finale-view')).toBeVisible();
    await expect(page.locator('#quota-gemini')).toHaveText('2 / 2 suất');
    await expect(page.locator('#quota-20k')).toHaveText('2 / 2 suất');
    await expect(page.locator('#quota-10k')).toHaveText('8 / 8 suất');

    // Kiểm tra tra cứu nhanh số của người dùng sau công bố
    await page.locator('#lookup-input').fill('347');
    await expect(page.locator('#lookup-result')).toContainText('TRÚNG GEMINI PRO');
    await page.locator('#lookup-input').fill('13');
    await expect(page.locator('#lookup-result')).toContainText('4 lượt chọn');
    await page.locator('#lookup-input').fill('999');
    await expect(page.locator('#lookup-result')).toContainText('không nằm trong danh sách');

    const geminiWinners = await page.locator('#winners-gemini .win-badge').allTextContents();
    const w20kWinners = await page.locator('#winners-20k .win-badge').allTextContents();
    const w10kWinners = await page.locator('#winners-10k .win-badge').allTextContents();
    const allWinners = [...geminiWinners, ...w20kWinners, ...w10kWinners];
    expect(new Set(allWinners).size).toBe(12);
    for (const w of allWinners) {
      expect(EXPECTED_POOL.has(w), `Winner ${w} must be in survey pool`).toBe(true);
    }
    const winners12A1 = allWinners.filter((w) => CLASS_12A1_CODES.has(w));
    expect(winners12A1.length, `12A1 winners should be 4, got ${winners12A1.join(', ')}`).toBe(4);
    expect(allWinners).not.toContain('017');

    // Kiểm tra các số trượt KHÔNG thuộc danh sách khảo sát
    const missedNums = await page.locator('#rounds-grid .round-tile.is-miss .rt-num').allTextContents();
    expect(missedNums.length).toBe(8);
    for (const m of missedNums) {
      expect(EXPECTED_POOL.has(m), `Miss ${m} must not be in survey pool`).toBe(false);
    }

    // Thoát mẫu thử về giờ thật
    await page.locator('#demo-exit-btn').click();
    await expect(page.locator('#demo-dock')).not.toHaveClass(/is-open/);
    await expect(page.locator('#quota-gemini')).toHaveText('0 / 2 suất');
  });
});
