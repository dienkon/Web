let serverUrlPromise: Promise<string> | null = null;
let backendReady: Promise<void> | null = null;
let backendCheckedAt = 0;

export class MeetingServiceError extends Error {
  constructor(message: string, public readonly code = 'BACKEND_UNAVAILABLE') { super(message); }
}

export function getServerUrl(): Promise<string> {
  if (!serverUrlPromise) serverUrlPromise = (async () => {
    const explicit = (import.meta.env.VITE_SERVER_URL || '').replace(/\/$/, '');
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
    if (explicit) {
      const url = new URL(explicit, location.origin);
      const pointsToLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      if (isLocal || (!pointsToLocalhost && url.protocol === 'https:')) return url.origin;
    }
    const response = await fetch('/api/config', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new MeetingServiceError('Không đọc được cấu hình cuộc gọi. Vui lòng tải lại trang.');
    const config = await response.json();
    if (!config.configured || config.serverUrl === null) throw new MeetingServiceError(
      config.message || 'Website chưa kết nối máy chủ cuộc gọi. Chủ website cần đặt REALTIME_SERVER_URL trên Vercel.',
      config.code || 'BACKEND_NOT_CONFIGURED');
    if (config.serverUrl === '') return '';
    const url = new URL(config.serverUrl);
    if (url.protocol !== 'https:' && !(isLocal && url.protocol === 'http:')) throw new MeetingServiceError('Địa chỉ máy chủ cuộc gọi phải dùng HTTPS.');
    return url.origin;
  })().catch(error => { serverUrlPromise = null; throw error; });
  return serverUrlPromise;
}

export function waitForBackend(): Promise<void> {
  if (Date.now() - backendCheckedAt < 15000) return Promise.resolve();
  if (!backendReady) backendReady = (async () => {
    const base = await getServerUrl();
    const deadline = Date.now() + 90000;
    // Free hosting can take about a minute to wake up. Retry only GET, never room creation.
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${base}/api/health`, {
          cache: 'no-store', signal: AbortSignal.timeout(Math.min(10000, deadline - Date.now())),
        });
        if (res.ok && (await res.json()).status === 'ok') { backendCheckedAt = Date.now(); return; }
      } catch { /* A sleeping service can return HTML or reset its connection. */ }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    throw new MeetingServiceError('Máy chủ cuộc gọi chưa khởi động được. Vui lòng thử lại sau khoảng một phút.');
  })().finally(() => { backendReady = null; });
  return backendReady;
}

export async function createRoom(): Promise<{ id: string; code: string; hostToken: string }> {
  await waitForBackend();
  const base = await getServerUrl();
  const res = await fetch(`${base}/api/rooms`, { method: 'POST', signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new MeetingServiceError(error.error || 'Không thể tạo phòng. Vui lòng thử lại.', error.code);
  }
  return res.json();
}
