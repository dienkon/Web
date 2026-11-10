import { test, expect, Page } from '@playwright/test';

async function instruments(page: Page) {
  await page.addInitScript(() => {
    const w = window as any;
    w.__peers = [];
    w.__sockets = [];
    const OriginalSocket = WebSocket;
    w.WebSocket = class extends OriginalSocket {
      constructor(url: string | URL, protocols?: string | string[]) { super(url, protocols); w.__sockets.push(this); }
    };
    const Original = RTCPeerConnection;
    w.RTCPeerConnection = class extends Original {
      constructor(config: RTCConfiguration) { super(config); w.__peers.push(this); }
    };
    // Synthetic capture only replaces the OS picker; RTP still travels over real WebRTC.
    navigator.mediaDevices.getDisplayMedia = async () => {
      const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext('2d')!;
      const draw = () => { ctx.fillStyle = `hsl(${Date.now() / 30 % 360},60%,40%)`; ctx.fillRect(0, 0, 960, 540); ctx.fillStyle = 'white'; ctx.font = '40px sans-serif'; ctx.fillText('Presentation ' + Date.now(), 40, 100); };
      draw(); const timer = setInterval(draw, 100);
      const stream = canvas.captureStream(10);
      const audio = new AudioContext(); const tone = audio.createOscillator(); const dest = audio.createMediaStreamDestination();
      tone.connect(dest); tone.start(); stream.addTrack(dest.stream.getAudioTracks()[0]);
      w.__screen = stream;
      stream.getVideoTracks()[0].addEventListener('ended', () => { clearInterval(timer); void audio.close(); });
      return stream;
    };
  });
}

async function join(page: Page, room: string, name: string) {
  await instruments(page);
  await page.goto(`/join/${room}`);
  await expect.poll(() => page.locator('video').first().evaluate((v: HTMLVideoElement) => (v.srcObject as MediaStream)?.getTracks().filter(t => t.readyState === 'live').length || 0)).toBe(2);
  await page.getByPlaceholder('Nguyễn Văn A').fill(name);
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(page.getByText('Đã kết nối', { exact: true })).toBeAttached();
}

async function received(page: Page, kind: 'audio' | 'video') {
  return page.evaluate(async kind => {
    let bytes = 0;
    for (const pc of (window as any).__peers as RTCPeerConnection[]) {
      if (pc.connectionState !== 'connected') continue;
      (await pc.getStats()).forEach(stat => { if (stat.type === 'inbound-rtp' && stat.kind === kind) bytes += stat.bytesReceived || 0; });
    }
    return bytes;
  }, kind);
}

test('real peers keep audio across layouts and send presentation plus tab sound to late arrivals', async ({ page, context }) => {
  const room = `RTC${Date.now()}`;
  const guest = await context.newPage();
  await guest.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    (window as any).__allowPlayback = false;
    HTMLMediaElement.prototype.play = function () {
      if (this.hasAttribute('data-remote-audio') && !(window as any).__allowPlayback) return Promise.reject(new DOMException('Playback blocked', 'NotAllowedError'));
      return original.call(this);
    };
  });
  await join(page, room, 'Giáo viên'); await join(guest, room, 'Học sinh');
  await expect.poll(() => received(guest, 'audio')).toBeGreaterThan(0);
  await expect.poll(() => received(page, 'audio')).toBeGreaterThan(0);
  await expect.poll(() => received(guest, 'video')).toBeGreaterThan(0);
  await expect(guest.getByRole('button', { name: 'Bấm để nghe âm thanh cuộc họp' })).toBeVisible();
  await guest.evaluate(() => { (window as any).__allowPlayback = true; });
  await guest.getByRole('button', { name: 'Bấm để nghe âm thanh cuộc họp' }).click();
  await expect(guest.getByRole('button', { name: 'Bấm để nghe âm thanh cuộc họp' })).toHaveCount(0);
  await expect.poll(() => page.locator('video').first().evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(1280);
  await page.getByRole('button', { name: 'Giơ tay', exact: true }).click();
  await expect(guest.locator('[title="Đang giơ tay"]')).toBeVisible();
  await guest.getByRole('button', { name: 'Dạng lưới', exact: true }).click();
  await expect(guest.getByRole('button', { name: 'Người nói', exact: true })).toBeVisible();
  await expect.poll(() => guest.locator('audio[data-remote-audio]').first().evaluate((el: HTMLAudioElement) => !el.paused && !el.muted)).toBe(true);
  await page.getByRole('button', { name: 'Chia sẻ màn hình', exact: true }).click();
  await expect(guest.getByText('Giáo viên đang trình chiếu', { exact: true })).toBeVisible();
  await expect.poll(() => guest.locator('video').first().evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(960);
  await expect.poll(() => guest.evaluate(async () => {
    let count = 0;
    for (const pc of (window as any).__peers as RTCPeerConnection[]) (await pc.getStats()).forEach(s => { if (s.type === 'inbound-rtp' && s.kind === 'audio' && s.bytesReceived > 0) count++; });
    return count;
  })).toBe(2);
  const late = await context.newPage(); await join(late, room, 'Đến sau');
  await expect(late.getByText('Giáo viên đang trình chiếu', { exact: true })).toBeVisible();
  await expect.poll(() => late.locator('video').first().evaluate((v: HTMLVideoElement) => v.videoWidth)).toBe(960);
  // Ending capture through browser UI must propagate and leave the microphone connected.
  await page.evaluate(() => (window as any).__screen.getVideoTracks()[0].dispatchEvent(new Event('ended')));
  await expect(guest.getByText('Giáo viên đang trình chiếu', { exact: true })).toHaveCount(0);
  await expect(late.getByText('Giáo viên đang trình chiếu', { exact: true })).toHaveCount(0);
  const before = await received(guest, 'audio');
  await expect.poll(() => received(guest, 'audio')).toBeGreaterThan(before);
  await page.getByRole('button', { name: 'Chia sẻ màn hình', exact: true }).click();
  await expect(guest.getByText('Giáo viên đang trình chiếu', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Dừng trình chiếu', exact: true }).first().click();
  await expect(guest.getByText('Giáo viên đang trình chiếu', { exact: true })).toHaveCount(0);
  await page.keyboard.press('Control+Shift+M');
  await expect(page.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await page.keyboard.press('Control+Shift+M');
  await expect(page.getByRole('button', { name: 'Tắt micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-desktop.png', fullPage: true });
});

test('camera permission denial preserves microphone and preview mute choice', async ({ page }) => {
  await page.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = constraints => constraints?.video ? Promise.reject(new DOMException('Denied camera', 'NotAllowedError')) : original(constraints);
  });
  await page.goto(`/join/AUDIO${Date.now()}`);
  await expect(page.locator('button[title="Tắt micro"]')).toBeVisible();
  await expect(page.locator('button[title="Bật camera"]')).toBeVisible();
  await page.locator('button[title="Tắt micro"]').click();
  await page.getByPlaceholder('Nguyễn Văn A').fill('Chỉ dùng micro');
  await page.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bật camera (Ctrl+Shift+V)', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tắt micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
});

test('mobile controls, settings, chat and leaving release devices', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await join(page, `MOBILE${Date.now()}`, 'Điện thoại');
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Thiết bị & âm thanh', exact: true }).click();
  await expect(page.getByRole('meter', { name: 'Mức âm thanh micro' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Trò chuyện', exact: true }).click();
  await page.getByPlaceholder('Nhập tin nhắn...').fill('Xin chào!');
  await page.getByPlaceholder('Nhập tin nhắn...').press('Enter');
  await expect(page.getByText('Xin chào!', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/meeting-mobile.png', fullPage: true });
  await page.evaluate(() => { (window as any).__tracks = [...document.querySelectorAll('video')].flatMap(v => (v.srcObject as MediaStream)?.getTracks() || []); });
  page.on('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Rời cuộc họp', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect.poll(() => page.evaluate(() => (window as any).__tracks.every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
});

test('devices enabled after joining are received and reconnect restores the call', async ({ page, context }) => {
  const guest = await context.newPage();
  const room = `LATE${Date.now()}`;
  await join(page, room, 'Người tạo');
  await instruments(guest);
  await guest.addInitScript(() => {
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    (window as any).__allowDevices = false;
    navigator.mediaDevices.getUserMedia = constraints => (window as any).__allowDevices ? original(constraints) : Promise.reject(new DOMException('Denied', 'NotAllowedError'));
  });
  await guest.goto(`/join/${room}`);
  await expect(guest.locator('button[title="Bật micro"]')).toBeVisible();
  await guest.getByPlaceholder('Nguyễn Văn A').fill('Bật thiết bị sau');
  await guest.getByRole('button', { name: 'Tham gia phòng', exact: true }).click();
  await expect(guest.getByText('Đã kết nối', { exact: true })).toBeAttached();
  await expect.poll(() => received(guest, 'audio')).toBeGreaterThan(0);
  await guest.evaluate(() => { (window as any).__allowDevices = true; });
  await guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true }).click();
  await guest.getByRole('button', { name: 'Bật camera (Ctrl+Shift+V)', exact: true }).click();
  await expect.poll(() => received(page, 'audio')).toBeGreaterThan(0);
  await expect.poll(() => received(page, 'video')).toBeGreaterThan(0);
  // Force a transport reconnect without navigating or recreating local devices.
  await expect.poll(() => guest.evaluate(() => (window as any).__sockets.filter((s: WebSocket) => s.url.includes('/socket.io/') && s.readyState === WebSocket.OPEN).length)).toBeGreaterThan(0);
  const previousCount = await guest.evaluate(() => (window as any).__peers.length);
  await guest.evaluate(() => (window as any).__sockets.filter((s: WebSocket) => s.url.includes('/socket.io/')).forEach((s: WebSocket) => s.close()));
  await expect.poll(() => guest.evaluate(() => (window as any).__peers.length)).toBeGreaterThan(previousCount);
  await expect.poll(() => guest.evaluate(() => (window as any).__peers.filter((p: RTCPeerConnection) => p.connectionState === 'connected').length)).toBe(1);
  await expect.poll(() => received(page, 'audio')).toBeGreaterThan(0);
  await expect(page.getByRole('button', { name: 'Người tham gia (2)', exact: true })).toBeVisible();
  // Device replacement must keep mute preference and preserve other tracks.
  await guest.getByRole('button', { name: 'Tắt micro (Ctrl+Shift+M)', exact: true }).click();
  await guest.getByRole('button', { name: 'Thiết bị & âm thanh', exact: true }).click();
  await guest.getByRole('dialog').getByLabel('Micro', { exact: true }).selectOption({ index: 1 });
  await expect(guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true })).toBeVisible();
  await guest.keyboard.press('Escape');
  await guest.getByRole('button', { name: 'Bật micro (Ctrl+Shift+M)', exact: true }).click();
  const before = await received(page, 'audio');
  await expect.poll(() => received(page, 'audio')).toBeGreaterThan(before);
});

test('home accepts an invitation URL and rejects malformed codes', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('textbox', { name: 'Mã phòng hoặc liên kết mời' }).fill('https://example.com/join/HELLO42?source=invite');
  await page.getByRole('button', { name: 'Tham gia bằng mã hoặc liên kết' }).click();
  await expect(page).toHaveURL('/join/HELLO42');
  await page.getByRole('button', { name: 'Quay lại Trang chủ' }).click();
  await page.getByRole('textbox', { name: 'Mã phòng hoặc liên kết mời' }).fill('not/a/room');
  await page.getByRole('button', { name: 'Tham gia bằng mã hoặc liên kết' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('Nhập mã phòng hợp lệ hoặc liên kết mời MeetClass.', { exact: true })).toBeVisible();
});
