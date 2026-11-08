import type { Request, Response, NextFunction } from 'express';
import { adminAuth, adminDb, decodeFirestoreDocument, getFirebaseApiKey } from '../firebaseAdmin.js';

export interface AuthenticatedUser { uid: string; email?: string; role: string; displayName?: string; accountStatus?: string; }
export interface AuthenticatedRequest extends Request { user?: AuthenticatedUser; }

// Headers, usernames, query parameters and decoded-but-unverified JWTs are never identity.
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (req.method === 'OPTIONS') return next();
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token || /^(student_|dk_admin_)/.test(token)) return res.status(401).json({ error: 'unauthorized', message: 'Cần đăng nhập bằng tài khoản Firebase hợp lệ.' });
  try {
    let identity: { uid: string; email?: string; name?: string; role?: string; accountStatus?: string };
    if (adminAuth) {
      const decoded = await adminAuth.verifyIdToken(token);
      identity = { uid: decoded.uid, email: decoded.email, name: decoded.name, role: decoded.role as string, accountStatus: decoded.accountStatus as string };
    } else {
      // Google verifies the token even when service-account credentials are unavailable.
      const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(getFirebaseApiKey())}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: token }), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('invalid_token');
      const account = (await response.json()).users?.[0];
      if (!account?.localId || account.disabled) throw new Error('invalid_token');
      identity = { uid: account.localId, email: account.email, name: account.displayName };
    }
    let profile: Record<string, any> | null = null;
    if (adminDb) {
      const snapshot = await adminDb.collection('users').doc(identity.uid).get();
      profile = snapshot.exists ? snapshot.data()! : null;
    } else {
      const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'exam-fd7a1';
      const response = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users/${encodeURIComponent(identity.uid)}`, {
        headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000),
      });
      if (response.ok) profile = decodeFirestoreDocument(await response.json());
      else if (response.status !== 404) throw new Error('profile_unavailable');
    }
    const status = profile?.accountStatus || identity.accountStatus || 'active';
    if (['suspended', 'disabled', 'deleted'].includes(status)) return res.status(403).json({ error: 'account_suspended', message: 'Tài khoản đã bị vô hiệu hóa.' });
    req.user = { uid: identity.uid, email: identity.email, role: profile?.role || identity.role || 'student', displayName: profile?.displayName || identity.name, accountStatus: status };
    return next();
  } catch {
    return res.status(401).json({ error: 'invalid_token', message: 'Không xác minh được phiên đăng nhập. Vui lòng đăng nhập lại.' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const check = () => ['admin', 'super_admin'].includes(req.user?.role || '') ? next() : res.status(403).json({ error: 'permission_denied', message: 'Bạn không có quyền quản trị.' });
  return req.user ? check() : requireAuth(req, res, check);
}
export async function requireSuperAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const check = () => req.user?.role === 'super_admin' ? next() : res.status(403).json({ error: 'permission_denied', message: 'Chỉ Super Admin có quyền thực hiện thao tác này.' });
  return req.user ? check() : requireAuth(req, res, check);
}
