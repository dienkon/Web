import { test, expect, Page } from '@playwright/test';
import { io, Socket } from 'socket.io-client';
import { randomBytes } from 'node:crypto';
import { createTestRoom, guestPage, closeGuestContexts } from './helpers';

test.afterEach(closeGuestContexts);


async function enter(page: Page, room: string, name: string, connected = true) {
  await page.goto(`/join/${room}`);
  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  if (connected) await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
}
async function controls(page: Page) {
  await page.getByRole('button', { name: 'Tùy chọn cuộc họp', exact: true }).click();
  await page.getByRole('button', { name: 'Quản lý phòng nâng cao', exact: true }).click();
}
function event(socket: Socket, name: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Missing ${name}`)), 10000);
    socket.once(name, data => { clearTimeout(timer); resolve(data); });
  });
}

test('creation reserves nine-character codes; unknown rooms fail without creating a meeting', async ({ page }) => {
  page.on('dialog', () => { throw new Error('Native browser dialog'); });
  await page.goto('/');
  await page.getByRole('button', { name: 'Tạo cuộc họp', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Phòng học đã được tạo' });
  const invitation = await dialog.locator('input').inputValue();
  expect(invitation).toMatch(/\/join\/[A-Z2-9]{9}$/);
  const unknown = 'ZZZZZZZZZ';
  await enter(page, unknown, 'Khách', false);
  await expect(page.getByRole('dialog', { name: 'Không thể vào phòng' })).toContainText('Phòng không tồn tại');
  expect((await page.request.get(`/api/rooms/${unknown}`)).status()).toBe(404);
  await expect(page.locator('audio[data-remote-audio]')).toHaveCount(0);
});

test('locked room stays locked when empty and its creator restores host privileges on return', async ({ page, context }) => {
  const room = await createTestRoom(page);
  await enter(page, room, 'Người tạo');
  await controls(page);
  await page.getByRole('button', { name: 'Khóa phòng học' }).click();
  await expect(page.getByText('Phòng đang khóa (Chặn người mới)')).toBeVisible();
  const guest = await guestPage(context);
  await enter(guest, room.toLowerCase(), 'Người tạo', false);
  await expect(guest.getByRole('dialog', { name: 'Không thể vào phòng' })).toContainText('đang bị khóa');
  await page.reload();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
  await controls(page); // Host capability survived a reload.
  await expect(page.getByText('Phòng đang khóa (Chặn người mới)')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Rời cuộc họp', exact: true }).click();
  await page.getByRole('dialog', { name: 'Xác nhận' }).getByRole('button', { name: 'Xác nhận', exact: true }).click();
  await expect(page).toHaveURL('/');
  const stranger = await guestPage(context);
  await enter(stranger, room, 'Chủ phòng giả', false);
  await expect(stranger.getByRole('dialog', { name: 'Không thể vào phòng' })).toContainText('đang bị khóa');
  await enter(page, room, 'Người tạo trở lại');
  await controls(page);
  await expect(page.getByText('Phòng đang khóa (Chặn người mới)')).toBeVisible();
});

test('approval gates media and membership; host can approve, reject and cancel pending requests by locking', async ({ page, context }) => {
  const room = await createTestRoom(page);
  await enter(page, room, 'Chủ phòng');
  await controls(page);
  await page.getByRole('switch', { name: 'Duyệt người tham gia', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Duyệt người tham gia', exact: true })).toHaveAttribute('aria-checked', 'true');
  const guest = await guestPage(context);
  await enter(guest, room, 'Chờ duyệt', false);
  await expect(guest.getByRole('dialog', { name: 'Chờ duyệt vào phòng' })).toBeVisible();
  await expect(guest.locator('audio[data-remote-audio]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Chấp nhận Chờ duyệt', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Có 1 yêu cầu tham gia/ }).click();
  await page.getByRole('button', { name: 'Chấp nhận Chờ duyệt', exact: true }).click();
  await expect(guest.getByText('Đã kết nối', { exact: true })).toBeVisible();
  await expect(page.getByText('Yêu cầu đang chờ (0)')).toBeVisible();
  const rejected = await guestPage(context);
  await enter(rejected, room, 'Từ chối', false);
  await page.getByRole('button', { name: 'Từ chối Từ chối', exact: true }).click();
  await expect(rejected.getByRole('dialog', { name: 'Không thể vào phòng' })).toContainText('từ chối');
  const pending = await guestPage(context);
  await enter(pending, room, 'Đợi khóa', false);
  await expect(page.getByRole('button', { name: 'Chấp nhận Đợi khóa', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Khóa phòng học' }).click();
  await expect(pending.getByRole('dialog', { name: 'Không thể vào phòng' })).toContainText('đang bị khóa');
  await expect(page.getByText('Yêu cầu đang chờ (0)')).toBeVisible();
});

test('server rejects forged host flags, blocks waiting-room chat and keeps people with identical names', async ({ page }) => {
  const response = await page.request.post('/api/rooms');
  const { code, hostToken } = await response.json();
  const sockets: Socket[] = [];
  const connect = async () => {
    const socket = io('http://localhost:5000', { autoConnect: false, forceNew: true });
    sockets.push(socket);
    const connected = event(socket, 'connect'); socket.connect(); await connected;
    return socket;
  };
  const payload = (name: string) => ({ roomId: `ROOM-${code}`, userName: name, identityToken: randomBytes(32).toString('hex'), audioEnabled: false, videoEnabled: false });
  try {
    const host = await connect(); let joined = event(host, 'room:joined');
    host.emit('room:join', { ...payload('Trùng tên'), hostToken });
    expect((await joined).participant.isHost).toBe(true);
    let updated = event(host, 'room:admission-mode'); host.emit('host:admission-mode', { required: true }); await updated;
    const guest = await connect(); const waiting = event(guest, 'room:waiting'); const list = event(host, 'room:waiting-list');
    const guestPayload = payload('Trùng tên');
    guest.emit('room:join', { ...guestPayload, isHost: true });
    await waiting;
    const requests = (await list).requests;
    let chatReceived = false;
    host.on('chat:message', () => { chatReceived = true; });
    guest.emit('chat:message', { text: 'Must not escape waiting room' });
    const mode = event(host, 'room:admission-mode'); host.emit('host:admission-mode', { required: true }); await mode;
    expect(chatReceived).toBe(false);
    joined = event(guest, 'room:joined');
    host.emit('host:admission-decide', { requestId: requests[0].id, approved: true });
    const state = await joined;
    expect(state.participants).toHaveLength(2);
    expect(state.participant.isHost).toBe(false);
    expect(state.participants.every((p: any) => !p.identityHash)).toBe(true);
    updated = event(host, 'room:locked'); host.emit('host:lock-room', { locked: true }); await updated;
    const attacker = await connect(); const denied = event(attacker, 'room:error');
    attacker.emit('room:join', { ...payload('Tấn công'), isHost: true });
    expect((await denied).message).toContain('đang bị khóa');
    // A removed participant loses signaling membership and cannot rejoin by changing its name.
    const removed = event(guest, 'host:removed-by-host'); host.emit('host:remove-participant', { targetId: guest.id }); await removed;
    const blocked = await connect(); const blockedError = event(blocked, 'room:error');
    blocked.emit('room:join', { ...guestPayload, userName: 'Tên mới' });
    expect((await blockedError).message).toContain('đã bị mời ra');
  } finally { sockets.forEach(s => s.disconnect()); }
});

test('media restrictions apply to new arrivals and timer state syncs to late arrivals', async ({ page, context }) => {
  const room = await createTestRoom(page);
  await enter(page, room, 'Chủ phòng');
  await controls(page);
  await page.getByRole('switch', { name: 'Cho phép micro', exact: true }).click();
  await page.getByRole('switch', { name: 'Cho phép camera', exact: true }).click();
  await page.getByRole('switch', { name: 'Cho phép chia sẻ màn hình', exact: true }).click();
  await page.getByRole('button', { name: 'Công cụ cuộc họp', exact: true }).click();
  await page.getByRole('button', { name: 'Bắt đầu', exact: true }).click();
  await page.keyboard.press('Escape');
  const guest = await guestPage(context);
  await enter(guest, room, 'Vào muộn');
  await expect(guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await expect(guest.getByRole('button', { name: 'Bật camera (Ctrl+Shift+V)', exact: true })).toBeVisible();
  await expect(guest.getByRole('timer', { name: 'Thời gian làm bài' })).toBeVisible();
  await guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true }).click();
  await expect(guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await guest.getByRole('button', { name: 'Chia sẻ màn hình', exact: true }).click();
  await expect(guest.getByText('Chủ phòng đã tắt quyền chia sẻ màn hình.', { exact: true })).toBeVisible();
});


test('peer creation waits for TURN configuration from the backend before negotiating', async ({ page, context }) => {
  const room = await createTestRoom(page);
  await page.addInitScript(() => {
    const original = RTCPeerConnection;
    (window as any).__rtcConfigurations = [];
    (window as any).RTCPeerConnection = class extends original {
      constructor(config: RTCConfiguration) { super(config); (window as any).__rtcConfigurations.push(config); }
    };
  });
  let release!: () => void;
  const configurationReady = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/ice-servers', async route => {
    await configurationReady;
    await route.fulfill({ json: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'turn:127.0.0.1:9?transport=tcp', username: 'test', credential: 'test' },
    ] } });
  });
  await enter(page, room, 'Chủ phòng');
  const request = page.waitForRequest('**/api/ice-servers');
  const guest = await guestPage(context);
  try {
    await enter(guest, room, 'Khách');
    await request;
    expect(await page.evaluate(() => (window as any).__rtcConfigurations.length)).toBe(0);
    release();
    await expect.poll(() => page.evaluate(() => (window as any).__rtcConfigurations.length)).toBe(1);
    const configuration = await page.evaluate(() => (window as any).__rtcConfigurations[0]);
    expect(configuration.iceServers).toContainEqual({ urls: 'turn:127.0.0.1:9?transport=tcp', username: 'test', credential: 'test' });
  } finally { release(); }
});
