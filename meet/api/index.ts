import type { VercelRequest, VercelResponse } from '@vercel/node';

// Serverless memory is not a shared room database. Forward REST to the same
// persistent service that owns Socket.IO admission, ownership and moderation.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  const backend = process.env.REALTIME_SERVER_URL || process.env.VITE_SERVER_URL;
  if (!backend) return res.status(503).json({ error: 'Máy chủ cuộc họp chưa được cấu hình.' });
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
    return res.status(503).json({ error: 'Không kết nối được máy chủ cuộc họp.' });
  }
}
