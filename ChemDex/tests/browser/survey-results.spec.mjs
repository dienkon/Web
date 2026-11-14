import { test, expect } from '@playwright/test';

test.describe('Minigame survey results page (/ket-qua-khao-sat)', () => {
  test('renders bright white layout, preserves Vietnamese prose, and hides numbers before reveal', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/ket-qua-khao-sat');
    await expect(page).toHaveTitle(/Kết quả Minigame Khảo Sát/);
    await expect(page.locator('#chemdex-sidebar')).toHaveCount(0);

    // Kiểm tra nền trắng sáng & chữ tiếng Việt nguyên vẹn (không bị chemicalHtml dịch)
    const bgColor = await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor);
    expect(bgColor).toBe('rgb(255, 255, 255)');
    await expect(page.locator('body')).toContainText('KẾT QUẢ MINIGAME KHẢO SÁT CHEMDEX');
    await expect(page.locator('body')).toContainText('0971431683');
    await expect(page.locator('body')).toContainText('Dương Thanh Điền');
    await expect(page.locator('#card-1 .digit-veil')).toHaveText(['?', '?', '?']);
    await expect(page.locator('#card-2 .digit-veil')).toHaveText(['?', '?', '?']);
    await expect(page.locator('#card-1')).not.toHaveClass(/is-revealed/);
    await expect(page.locator('#card-2')).not.toHaveClass(/is-revealed/);

    // Kiểm tra responsive mobile 360px không tràn ngang
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/ket-qua-khao-sat/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    expect(overflow).toBe(true);
    expect(errors).toEqual([]);
  });

  test('demo preview button triggers final-seconds effects, reveals 564 then 638 1 minute apart, and resets cleanly', async ({ page }) => {
    await page.goto('/ket-qua-khao-sat/');

    await page.locator('#demo-toggle-btn').click();
    await expect(page.locator('#demo-dock')).toHaveClass(/is-open/);

    // Nhảy mốc 5 phút cuối -> kiểm tra phase warm & vòng tròn tiến trình
    await page.locator('[data-preset="five-min"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'warm');
    await expect(page.locator('#precision-ring-wrap')).toHaveClass(/is-visible/);

    // Nhảy 12s cuối và tăng tốc 5x để qua mốc 18:00:00 -> mở 564
    await page.locator('[data-preset="twelve-sec"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'crescendo');

    await page.locator('#demo-speed-btn').click(); // 5x
    await expect(page.locator('#card-1')).toHaveClass(/is-revealed/, { timeout: 10000 });
    await expect(page.locator('#card-1')).toContainText('Đã công bố lúc 18:00:00');

    // Khi Giải #1 vừa mở xong, Giải #2 phải đang đếm ngược khoảng cách 1 phút
    await expect(page.locator('#card-2')).toHaveClass(/is-counting/);
    await expect(page.locator('#card-2')).not.toHaveClass(/is-revealed/);

    // Tua tới 8s trước Giải #2 -> mở 638
    await page.locator('[data-preset="second-gap"]').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'crescendo');
    await expect(page.locator('#card-2')).toHaveClass(/is-revealed/, { timeout: 10000 });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'completed');

    // Xác minh vị trí hiển thị trực quan của 2 con số 564 và 638 khớp chính xác trong khung
    await page.waitForTimeout(200);
    const alignedDigits = await page.evaluate(() => {
      const readCard = (sel) =>
        [...document.querySelectorAll(`${sel} .digit-box`)].map((box) => {
          const br = box.getBoundingClientRect();
          const item = [...box.querySelectorAll('.digit-item')].find((el) => {
            const ir = el.getBoundingClientRect();
            return Math.abs(ir.top - br.top) < 3 && Math.abs(ir.bottom - br.bottom) < 3;
          });
          return item ? item.textContent.trim() : null;
        });
      return { card1: readCard('#card-1'), card2: readCard('#card-2') };
    });
    expect(alignedDigits).toEqual({
      card1: ['5', '6', '4'],
      card2: ['6', '3', '8'],
    });

    // Quay về giờ thật -> reset về trạng thái chờ
    await page.locator('#demo-exit-btn').click();
    await expect(page.locator('#demo-dock')).not.toHaveClass(/is-open/);
    await expect(page.locator('#card-1')).not.toHaveClass(/is-revealed/);
    await expect(page.locator('#card-2')).not.toHaveClass(/is-revealed/);
  });
});
