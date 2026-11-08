import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ verify: vi.fn(), profile: vi.fn() }));
vi.mock('../server/firebaseAdmin.js', () => ({ adminAuth: { verifyIdToken: state.verify }, adminDb: { collection: () => ({ doc: () => ({ get: state.profile }) }) }, getFirebaseApiKey: () => 'test-key', decodeFirestoreDocument: (value: any) => value }));
import { requireAuth, requireSuperAdmin } from '../server/middleware/auth';
function fixture(headers: any = {}) { const req = { method: 'GET', headers, query: { studentUid: 'victim' } } as any; const res = { status: vi.fn(), json: vi.fn() } as any; res.status.mockReturnValue(res); return { req, res, next: vi.fn() }; }
beforeEach(() => { vi.clearAllMocks(); state.verify.mockResolvedValue({ uid: 'verified-user', email: 'student@example.test' }); state.profile.mockResolvedValue({ exists: true, data: () => ({ role: 'student', accountStatus: 'active' }) }); });
it.each([{ 'x-student-uid': 'victim' }, { authorization: 'Bearer student_victim' }, { authorization: 'Bearer dk_admin_fake', 'x-auth-role': 'admin' }])('rejects forged identity %j', async (headers) => {
  const f = fixture(headers); await requireAuth(f.req, f.res, f.next); expect(f.res.status).toHaveBeenCalledWith(401); expect(f.next).not.toHaveBeenCalled(); expect(state.verify).not.toHaveBeenCalled();
});
it('uses verified UID/profile and ignores claimed admin headers', async () => {
  const f = fixture({ authorization: 'Bearer signed-token', 'x-auth-role': 'admin', 'x-student-uid': 'victim' }); await requireAuth(f.req, f.res, f.next); expect(f.req.user).toMatchObject({ uid: 'verified-user', role: 'student' }); expect(f.next).toHaveBeenCalledOnce();
});
it('does not decode an unsigned JWT to bypass verification failure', async () => {
  state.verify.mockRejectedValueOnce(new Error('bad signature')); const f = fixture({ authorization: 'Bearer fake.payload.signature', 'x-student-uid': 'victim' }); await requireAuth(f.req, f.res, f.next); expect(f.res.status).toHaveBeenCalledWith(401); expect(f.next).not.toHaveBeenCalled();
});
it('denies suspended accounts and does not equate admin with super admin', async () => {
  state.profile.mockResolvedValueOnce({ exists: true, data: () => ({ role: 'student', accountStatus: 'suspended' }) }); const f = fixture({ authorization: 'Bearer signed-token' }); await requireAuth(f.req, f.res, f.next); expect(f.res.status).toHaveBeenCalledWith(403);
  const g = fixture(); g.req.user = { uid: 'admin', role: 'admin' }; await requireSuperAdmin(g.req, g.res, g.next); expect(g.res.status).toHaveBeenCalledWith(403); expect(g.next).not.toHaveBeenCalled();
});
