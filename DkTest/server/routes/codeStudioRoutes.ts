import express from 'express';
import { publishStudioShare, readStudioShare, renderStudioShareHtml } from '../codeStudioShares.js';
import { shareIdFromSlug } from '../../src/practice/code-studio/publishedShare.js';
import { PRODUCTION_HTML_TEMPLATE } from '../../src/services/server/generatedHtmlTemplate.js';
export const codeStudioRouter = express.Router();
const publishes = new Map<string, number>();
codeStudioRouter.post('/shares', express.json({ limit: '950kb' }), async (req, res) => {
  const ip = req.ip || 'unknown';
  if ((publishes.get(ip) || 0) > Date.now() - 3000) return res.status(429).json({ error: 'Vui lòng đợi vài giây trước khi tạo link mới.' });
  if (publishes.size > 2000) publishes.clear();
  publishes.set(ip, Date.now());
  try { return res.status(201).json(await publishStudioShare(req.body)); }
  catch (e: any) { return res.status(e.status || 400).json({ error: e.message || 'Không lưu được chia sẻ.' }); }
});
codeStudioRouter.get('/shares/:id', async (req, res) => {
  try {
    const share = await readStudioShare(req.params.id);
    if (!share) return res.status(404).json({ error: 'Link không tồn tại hoặc đã bị gỡ.' });
    res.setHeader('Cache-Control', 'public, max-age=3600'); return res.json(share);
  } catch (e: any) { return res.status(e.status || 503).json({ error: e.message }); }
});
codeStudioRouter.get('/shares/:id/image.jpg', async (req, res) => {
  try {
    const share = await readStudioShare(req.params.id);
    if (!share) return res.status(404).end();
    if (share.imageUrl) return res.redirect(302, share.imageUrl);
    if (!share.imageDataUrl) return res.status(404).end();
    const bytes = Buffer.from(share.imageDataUrl.split(',')[1], 'base64');
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return res.status(400).end();
    res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); return res.send(bytes);
  } catch { return res.status(503).end(); }
});
export async function handleStudioSharePage(req: any, res: any) {
  try {
    const slug = req.params.slug || String(req.query.slug || '');
    const id = shareIdFromSlug(slug);
    const share = await readStudioShare(id);
    if (!share) return res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><h1>Link không tồn tại</h1>');
    const host = String(req.get?.('host') || req.headers.host || '');
    if (!/^[a-zA-Z0-9.:-]+$/.test(host)) return res.status(400).end();
    const protocol = req.headers['x-forwarded-proto'] === 'https' || req.protocol === 'https' ? 'https' : 'http';
    const origin = `${protocol}://${host}`;
    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.type('html').send(renderStudioShareHtml(PRODUCTION_HTML_TEMPLATE, share, `${origin}/s/${encodeURIComponent(slug)}`, share.imageUrl || (share.imageDataUrl ? `${origin}/api/code-studio/shares/${id}/image.jpg` : '')));
  } catch { return res.status(503).type('html').send('<!doctype html><meta charset="utf-8"><h1>Chưa thể tải link chia sẻ</h1><p>Vui lòng kiểm tra cấu hình Firebase.</p>'); }
}
