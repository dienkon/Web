import type { ShareMode } from './sharing';
export interface ProjectShareBinding { ownerUid: string; id: string; path: string; mode: ShareMode; title: string; description: string; imageUrl?: string }
const key = (projectId: string) => 'dktest.code-studio.share.v2.' + projectId;
export function readProjectShare(projectId: string): ProjectShareBinding | null {
  try {
    const value = JSON.parse(localStorage.getItem(key(projectId)) || 'null');
    if (value && typeof value.title === 'string' && typeof value.description === 'string' && (value.imageUrl === undefined || typeof value.imageUrl === 'string') && typeof value.ownerUid === 'string' && /^[a-f0-9]{16}$/.test(value.id) && typeof value.path === 'string' && new RegExp(`^/s/[a-z0-9-]+\\.${value.id}$`).test(value.path) && ['website','website-edit','editor'].includes(value.mode)) return value;
  } catch { /* A missing local binding can be recovered from owner + project ID. */ }
  return null;
}
export function saveProjectShare(projectId: string, binding: ProjectShareBinding) {
  localStorage.setItem(key(projectId), JSON.stringify(binding));
}

/** Called only on explicit publish. Guest auth is separate from the app login. */
export async function shareIdentity(binding: ProjectShareBinding | null) {
  const [{ auth }, { getApps, initializeApp }, { getAuth, signInAnonymously }] = await Promise.all([
    import('../../services/firebase/config'), import('firebase/app'), import('firebase/auth'),
  ]);
  if (!auth) throw new Error('Chưa cấu hình xác thực chia sẻ. Vui lòng thử lại sau.');
  await auth.authStateReady();
  if (auth.currentUser && (!binding || auth.currentUser.uid === binding.ownerUid)) return { uid: auth.currentUser.uid, token: await auth.currentUser.getIdToken(true) };
  const app = getApps().find(a => a.name === 'code-studio-publisher') || initializeApp(auth.app.options, 'code-studio-publisher');
  const guest = getAuth(app); await guest.authStateReady();
  if (!guest.currentUser && !binding) {
    try { await signInAnonymously(guest); }
    catch { throw new Error('Vui lòng đăng nhập để tạo link chia sẻ, hoặc bật đăng nhập khách trong Firebase.'); }
  }
  if (!guest.currentUser || (binding && guest.currentUser.uid !== binding.ownerUid)) throw new Error('Hãy đăng nhập đúng tài khoản đã tạo link này để cập nhật.');
  return { uid: guest.currentUser.uid, token: await guest.currentUser.getIdToken(true) };
}
