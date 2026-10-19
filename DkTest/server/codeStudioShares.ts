import { randomBytes } from 'node:crypto';
import { adminDb, decodeFirestoreDocument, encodeFirestoreFields } from './firebaseAdmin.js';
import { PublishedShare, shareSlug, validatePublishedShare } from '../src/practice/code-studio/publishedShare.js';

const collection = 'code_studio_shares';
function restUrl(id = '') {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'exam-fd7a1';
  const key = process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '';
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${collection}${id ? '/' + id : ''}?key=${encodeURIComponent(key)}`;
}
export async function readStudioShare(id: string): Promise<PublishedShare | null> {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  if (adminDb) { const doc = await adminDb.collection(collection).doc(id).get(); return doc.exists ? validatePublishedShare(doc.data()) : null; }
  const response = await fetch(restUrl(id), { signal: AbortSignal.timeout(10000) });
  if (response.status === 404) return null;
  if (!response.ok) throw Object.assign(new Error('Không đọc được Firebase. Cần áp dụng rules code_studio_shares hoặc cấu hình Firebase Admin.'), { status: 503 });
  return validatePublishedShare(decodeFirestoreDocument(await response.json()));
}
/** The sole Firestore write path. Called only by POST /shares after explicit Publish. */
export async function publishStudioShare(input: unknown) {
  const share = validatePublishedShare(input);
  if (share.imageDataUrl) throw new Error('Ảnh chia sẻ mới phải lưu qua Cloudinary. Hãy tải lại trang và tạo link lại.');
  share.createdAt = new Date().toISOString();
  const id = randomBytes(8).toString('hex');
  if (adminDb) await adminDb.collection(collection).doc(id).create(share);
  else {
    const response = await fetch(restUrl() + `&documentId=${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: encodeFirestoreFields(share) }), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw Object.assign(new Error('Firebase chưa cho phép lưu chia sẻ. Áp dụng firestore.rules cho code_studio_shares hoặc cấu hình Firebase Admin trên server.'), { status: 503 });
  }
  return { id, path: `/s/${shareSlug(share.title)}.${id}`, title: share.title, createdAt: share.createdAt };
}

const escape = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
export function renderStudioShareHtml(template: string, share: PublishedShare, canonical: string, imageUrl = share.imageUrl || '') {
  const title = escape(share.title), description = escape(share.description), url = escape(canonical), image = escape(imageUrl);
  const clean = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '').replace(/<meta\b[^>]*(?:name|property)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>/gi, '').replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '');
  const imageTags = image ? `<meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${image}">` : '';
  const tags = `<title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${title}">${imageTags}`;
  return clean.replace(/<\/head>/i, tags + '</head>');
}
