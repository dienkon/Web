import { test, expect, Page } from '@playwright/test';
import { createTestRoom, guestPage, closeGuestContexts } from './helpers';
async function enter(page: Page, room: string, name: string) {
  await page.goto(`/join/${room}`);
  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
}
async function controls(page: Page) {
  await page.getByRole('button', { name: 'Tùy chọn cuộc họp', exact: true }).click();
  await page.getByRole('button', { name: 'Quản lý phòng nâng cao', exact: true }).click();
}
async function pixels(page: Page) {
  return page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
    const data = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data;
    let count = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) count++;
    return count;
  });
}
test('whiteboard restores strokes when opened late and clear uses a cancellable popup', async ({ page, context }) => {
  page.on('dialog', () => { throw new Error('Native browser dialog'); });
  const room = await createTestRoom(page);
  await enter(page, room, 'Chủ phòng');
  const guest = await guestPage(context);
  await enter(guest, room, 'Khách');
  await page.getByRole('button', { name: 'Bảng vẽ cộng tác', exact: true }).click();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const box = (await canvas.boundingBox())!;
  await page.mouse.move(box.x + 50, box.y + 50); await page.mouse.down();
  await page.mouse.move(box.x + 150, box.y + 130, { steps: 8 }); await page.mouse.up();
  await expect.poll(() => pixels(page)).toBeGreaterThan(0);
  await guest.getByRole('button', { name: 'Bảng vẽ cộng tác', exact: true }).click();
  await expect.poll(() => pixels(guest)).toBeGreaterThan(0);
  await guest.getByTitle('Đóng bảng vẽ').click();
  await guest.getByRole('button', { name: 'Bảng vẽ cộng tác', exact: true }).click();
  await expect.poll(() => pixels(guest)).toBeGreaterThan(0);
  await page.getByTitle('Xóa toàn bộ bảng').click();
  await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Hủy', exact: true }).click();
  await expect.poll(() => pixels(page)).toBeGreaterThan(0);
  await page.getByTitle('Xóa toàn bộ bảng').click();
  await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect.poll(() => pixels(guest)).toBe(0);
});

test.afterEach(closeGuestContexts);


test('chat, selected answer and question lock restore after rejoin; reopening preserves answers', async ({ page, context }) => {
  const room = await createTestRoom(page);
  await enter(page, room, 'Chủ phòng');
  await page.getByRole('button', { name: 'Trò chuyện', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Trò chuyện', exact: true })).toBeVisible();
  await page.getByPlaceholder('Nhập tin nhắn...').fill('Tin nhắn trước khi khách vào');
  await page.getByPlaceholder('Nhập tin nhắn...').press('Enter');
  await page.keyboard.press('Escape');
  const guest = await guestPage(context);
  await enter(guest, room, 'Học sinh');
  await guest.getByRole('button', { name: 'Trò chuyện', exact: true }).click();
  await expect(guest.getByText('Tin nhắn trước khi khách vào', { exact: true })).toBeVisible();
  await guest.keyboard.press('Escape');
  await controls(page);
  await page.getByRole('button', { name: 'Tạo câu hỏi mới', exact: true }).click();
  await page.getByLabel('Nội dung câu hỏi', { exact: true }).fill('Chọn một đáp án');
  await page.getByRole('button', { name: 'Bắt đầu câu hỏi', exact: true }).click();
  await guest.getByRole('button', { name: 'B Đáp án B', exact: true }).click();
  await expect(page.getByText('Tổng số câu trả lời:')).toContainText('1');
  await page.getByRole('button', { name: 'Khóa', exact: true }).click();
  await guest.reload();
  await expect(guest.getByText('Đã kết nối', { exact: true })).toBeVisible();
  await expect(guest.getByText('Bạn đã chọn đáp án B', { exact: true })).toBeVisible();
  await expect(guest.getByRole('button', { name: 'B Đáp án B', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Mở lại', exact: true }).click();
  await expect(guest.getByRole('button', { name: 'B Đáp án B', exact: true })).toBeEnabled();
  await expect(page.getByText('Tổng số câu trả lời:')).toContainText('1');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText('Tổng số câu trả lời:')).toContainText('0');
  await expect(guest.getByText('Bạn đã chọn đáp án B', { exact: true })).toHaveCount(0);
});
