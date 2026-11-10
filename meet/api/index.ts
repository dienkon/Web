import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serverless memory is not a shared room database. Forward REST to the same
// persistent service that owns Socket.IO admission, ownership and moderation.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const setupMessage = 'Chưa kết nối máy chủ cuộc gọi. Chủ website cần deploy backend miễn phí trên Render, đặt REALTIME_SERVER_URL trong Vercel rồi Redeploy. Không cần key trả phí để tạo phòng.';
  let backend: URL | null = null;
  try {
    const value = process.env.REALTIME_SERVER_URL || process.env.VITE_SERVER_URL;
    if (value) {
      const parsed = new URL(value);
      if (parsed.protocol === 'https:' && !parsed.username && !parsed.password && parsed.host !== req.headers.host &&
        !['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname) && parsed.pathname === '/') backend = parsed;
    }
  } catch { /* Report setup state without exposing environment values. */ }
  if ((req.url || '').split('?')[0] === '/api/config' && req.method === 'GET') {
    return res.status(200).json({ configured: !!backend, serverUrl: backend?.origin || null,
      ...(!backend ? { code: 'BACKEND_NOT_CONFIGURED', message: setupMessage } : {}) });
  }
  if (!backend) return res.status(503).json({ code: 'BACKEND_NOT_CONFIGURED', error: setupMessage });
  try {
    const target = new URL(req.url || '/api/health', backend);
    const ownHost = req.headers.host;
    if (target.host === ownHost) return res.status(503).json({ error: 'Cấu hình máy chủ cuộc họp không hợp lệ.' });
    const upstream = await fetch(target, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : JSON.stringify(req.body || {}),
      signal: AbortSignal.timeout(10000),
    });
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.status(upstream.status).send(await upstream.text());
  } catch {
    return res.status(503).json({ code: 'BACKEND_UNAVAILABLE', error: 'Máy chủ cuộc gọi đang khởi động hoặc tạm thời chưa truy cập được. Vui lòng chờ khoảng một phút rồi thử lại.' });
  }
}
