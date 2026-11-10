import { test, expect, Page } from '@playwright/test';

async function instruments(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__peers = [];
    w.__sockets = [];
    const OriginalSocket = WebSocket;
    w.WebSocket = class extends OriginalSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        w.__sockets.push(this);
      }
    };
    const Original = RTCPeerConnection;
    w.RTCPeerConnection = class extends Original {
      constructor(config: RTCConfiguration) {
        super(config);
        w.__peers.push(this);
      }
    };
  });
}

async function joinRoom(page: Page, room: string, name: string) {
  await instruments(page);
  await page.goto(`/join/${room}`);
  await expect.poll(() =>
    page
      .locator('video')
      .first()
      .evaluate(
        (v: HTMLVideoElement) =>
          (v.srcObject as MediaStream)?.getTracks().filter((t) => t.readyState === 'live').length || 0
      )
  ).toBe(2);
  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeAttached();
}

test('collaborative whiteboard opens, provides pen/eraser tools, and can be saved or closed', async ({
  page,
}) => {
  const room = `BOARD${Date.now()}`;
  await joinRoom(page, room, 'Giáo viên');

  // Open Whiteboard
  await page.getByRole('button', { name: 'Bảng vẽ cộng tác', exact: true }).click();
  await expect(page.getByText('Bảng vẽ cộng tác thời gian thực', { exact: true })).toBeVisible();

  // Check tools
  await expect(page.getByTitle('Bút vẽ')).toBeVisible();
  await expect(page.getByTitle('Tẩy nét vẽ')).toBeVisible();
  await expect(page.getByTitle('Xóa toàn bộ bảng')).toBeVisible();
  await expect(page.getByTitle('Tải ảnh về máy')).toBeVisible();

  // Switch to eraser and back to pen
  await page.getByTitle('Tẩy nét vẽ').click();
  await page.getByTitle('Bút vẽ').click();

  // Close whiteboard
  await page.getByTitle('Đóng bảng vẽ').click();
  await expect(page.getByText('Bảng vẽ cộng tác thời gian thực', { exact: true })).toHaveCount(0);
});

test('interactive reactions bar sends emoji and displays floating reaction with sender name', async ({
  page,
  context,
}) => {
  const room = `REACTION${Date.now()}`;
  const guest = await context.newPage();

  await joinRoom(page, room, 'Giáo viên');
  await joinRoom(guest, room, 'Học sinh');

  // Teacher clicks reaction button
  await page.getByRole('button', { name: 'Bày tỏ cảm xúc', exact: true }).click();
  await expect(page.getByTitle('Yêu thích')).toBeVisible();

  // Send heart reaction
  await page.getByTitle('Yêu thích').click();

  // Verify floating reaction appears with sender name 'Giáo viên'
  await expect(page.getByText('Giáo viên', { exact: true }).first()).toBeVisible();
  await expect(guest.getByText('Giáo viên', { exact: true }).first()).toBeVisible();
});

test('mobile camera flip switches between front and rear cameras seamlessly', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const room = `FLIP${Date.now()}`;
  await joinRoom(page, room, 'Mobile User');

  // Camera flip button is visible when camera is on
  const flipButton = page.getByRole('button', { name: 'Lật camera trước/sau', exact: true });
  await expect(flipButton).toBeVisible();

  await flipButton.click();
  await expect(page.getByText('Đã chuyển sang camera sau', { exact: true })).toBeVisible();

  await flipButton.click();
  await expect(page.getByText('Đã chuyển sang camera trước', { exact: true })).toBeVisible();
});

test('host moderation controls lower raised hands and lock room', async ({ page, context }) => {
  const room = `MOD${Date.now()}`;
  const student = await context.newPage();

  await joinRoom(page, room, 'Giáo viên Chủ phòng');
  await joinRoom(student, room, 'Học sinh A');

  // Student raises hand
  await student.getByRole('button', { name: 'Giơ tay', exact: true }).click();
  await expect(student.getByRole('button', { name: 'Hạ tay', exact: true })).toBeVisible();
  await expect(page.locator('[title="Đang giơ tay"]')).toBeVisible();

  // Host opens host modal
  await page.getByRole('button', { name: 'Tùy chọn cuộc họp', exact: true }).click();
  await page.getByRole('button', { name: 'Quản lý phòng nâng cao', exact: true }).click();

  // Switch to room management tab
  await page.getByRole('button', { name: 'Quản lý lớp học', exact: true }).click();
  await expect(page.getByText('Danh sách đang giơ tay (1)')).toBeVisible();

  // Lower all hands
  await page.getByRole('button', { name: 'Hạ tay tất cả' }).click();
  await expect(student.getByRole('button', { name: 'Giơ tay', exact: true })).toBeVisible();

  // Lock room
  await page.getByRole('button', { name: 'Khóa phòng học' }).click();
  await expect(page.getByText('Phòng đang khóa (Chặn người mới)')).toBeVisible();
});
