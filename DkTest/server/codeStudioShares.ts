import { createHash } from 'node:crypto';
import { adminAuth, adminDb, decodeFirestoreDocument, encodeFirestoreFields } from './firebaseAdmin.js';
import { PublishedShare, shareSlug, validatePublishedShare } from '../src/practice/code-studio/publishedShare.js';

const collection = 'code_studio_shares';
const failure = (message: string, status: number) => Object.assign(new Error(message), { status });
function apiKey() { return process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || ''; }
function restUrl(id: string) {
  const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'exam-fd7a1';
  return `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(project)}/databases/(default)/documents/${collection}/${id}?key=${encodeURIComponent(apiKey())}`;
}
async function readRawShare(id: string) {
  const response = await fetch(restUrl(id), { signal: AbortSignal.timeout(10000), cache: 'no-store' });
  if (response.status === 404) return null;
  if (!response.ok) throw failure('Không đọc được Firebase. Kiểm tra rules code_studio_shares hoặc Firebase Admin.', 503);
  const document = await response.json();
  return { data: decodeFirestoreDocument(document), updateTime: document.updateTime as string | undefined };
}
export async function readStudioShare(id: string): Promise<PublishedShare | null> {
  if (!/^[a-f0-9]{16}$/.test(id)) return null;
  if (adminDb) { const doc = await adminDb.collection(collection).doc(id).get(); return doc.exists ? validatePublishedShare(doc.data()) : null; }
  const document = await readRawShare(id);
  return document ? validatePublishedShare(document.data) : null;
}
async function publisherUid(token?: string): Promise<string> {
  if (!token) throw failure('Vui lòng đăng nhập hoặc xác thực phiên chia sẻ rồi thử lại.', 401);
  if (adminAuth) {
    try { return (await adminAuth.verifyIdToken(token)).uid; }
    catch { throw failure('Phiên chia sẻ đã hết hạn. Vui lòng đăng nhập lại.', 401); }
  }
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey())}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw failure('Không xác thực được phiên chia sẻ. Vui lòng đăng nhập lại.', response.status >= 500 ? 503 : 401);
  const data = await response.json();
  const uid = data.users?.[0]?.localId;
  if (typeof uid !== 'string' || !uid) throw failure('Phiên chia sẻ không hợp lệ.', 401);
  return uid;
}
/** Only explicit publish creates/updates the single owner-bound document. */
export async function publishStudioShare(input: any, token?: string) {
  const share = validatePublishedShare(input);
  if (share.imageDataUrl) throw new Error('Ảnh chia sẻ mới phải lưu qua Cloudinary. Hãy tải lại trang và tạo link lại.');
  const projectId = input.projectId;
  if (typeof projectId !== 'string' || !/^[\w-]{1,80}$/.test(projectId)) throw failure('Thiếu mã dự án. Hãy tải lại trang trước khi chia sẻ.', 400);
  const ownerUid = await publisherUid(token);
  const id = createHash('sha256').update(ownerUid + '\0' + projectId).digest('hex').slice(0, 16);
  if (input.shareId !== undefined && input.shareId !== id) throw failure('Link này thuộc dự án hoặc tài khoản khác. Không thể ghi đè.', 403);
  const now = new Date().toISOString();
  const build = (existing: any) => {
    if (existing && (existing.ownerUid !== ownerUid || existing.projectId !== projectId)) throw failure('Bạn không có quyền cập nhật link này.', 403);
    // The original slug and timestamp remain fixed even when title/mode change.
    return { ...share, ownerUid, projectId, slug: existing?.slug || shareSlug(share.title), createdAt: existing?.createdAt || now, updatedAt: now };
  };
  let saved: ReturnType<typeof build>;
  if (adminDb) {
    const ref = adminDb.collection(collection).doc(id);
    saved = await adminDb.runTransaction(async tx => {
      const doc = await tx.get(ref); const next = build(doc.exists ? doc.data() : null);
      tx.set(ref, next); return next;
    });
  } else {
    const current = await readRawShare(id); saved = build(current?.data);
    const precondition = current?.updateTime ? '&currentDocument.updateTime=' + encodeURIComponent(current.updateTime) : '&currentDocument.exists=' + Boolean(current);
    const response = await fetch(restUrl(id) + precondition, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ fields: encodeFirestoreFields(saved) }), signal: AbortSignal.timeout(15000) });
    if (response.status === 409 || response.status === 412) throw failure('Dự án vừa được chia sẻ ở phiên khác. Bấm cập nhật lại để giữ cùng link.', 409);
    if (!response.ok) throw failure('Firebase chưa cho phép cập nhật link. Áp dụng rules code_studio_shares hoặc cấu hình Firebase Admin.', 503);
  }
  return { id, path: `/s/${saved.slug}.${id}`, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt };
}

const escape = (value: string) => value.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!));
export function renderStudioShareHtml(template: string, share: PublishedShare, canonical: string, imageUrl = share.imageUrl || '') {
  const title = escape(share.title), description = escape(share.description), url = escape(canonical), image = escape(imageUrl);
  const clean = template.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '').replace(/<meta\b[^>]*(?:name|property)=["'](?:og:[^"']*|twitter:[^"']*|description)["'][^>]*>/gi, '').replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, '');
  const imageTags = image ? `<meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:image" content="${image}">` : '';
  const tags = `<title>${title}</title><meta name="description" content="${description}"><link rel="canonical" href="${url}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${url}"><meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}"><meta name="twitter:title" content="${title}">${imageTags}`;
  return clean.replace(/<\/head>/i, tags + '</head>');
}
