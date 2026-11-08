import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ uid: 'student-a', get: vi.fn() }));
vi.mock('../firebase/config', () => ({ auth: { get currentUser() { return { uid: mock.uid }; } }, db: {} }));
vi.mock('firebase/firestore', () => ({ doc: (_: any, collection: string, id: string) => `${collection}/${id}`, getDocFromServer: mock.get }));
import { requireOfflineDownloadAccess, requirePurchasedExam } from './access';
beforeEach(() => { vi.clearAllMocks(); mock.uid = 'student-a'; mock.get.mockResolvedValue({ exists: () => true, data: () => ({ uid: 'student-a', examId: 'paid', status: 'active' }) }); });
it('does not read an entitlement for a free non-personal exam', async () => {
  await requireOfflineDownloadAccess('student-a', { id: 'free', accessMode: 'free', priceVnd: 0 } as any); expect(mock.get).not.toHaveBeenCalled();
});
it.each([{ uid: 'other', examId: 'paid', status: 'active' }, { uid: 'student-a', examId: 'other', status: 'active' }, { uid: 'student-a', examId: 'paid', status: 'revoked' }, { balanceVnd: 1000000 }])('denies invalid entitlement %j', async (data) => {
  mock.get.mockResolvedValue({ exists: () => true, data: () => data }); await expect(requirePurchasedExam('student-a', 'paid')).rejects.toThrow('chưa mua');
});
it('requires a fresh purchase even if accessMode and price disagree', async () => {
  await requireOfflineDownloadAccess('student-a', { id: 'paid', accessMode: 'free', priceVnd: 1000 } as any); expect(mock.get).toHaveBeenCalledWith('exam_entitlements/student-a_paid');
  await requireOfflineDownloadAccess('student-a', { id: 'paid', accessMode: 'paid', priceVnd: 0 } as any); expect(mock.get).toHaveBeenCalledTimes(2);
});
it('fails closed on missing entitlement or network error', async () => {
  mock.get.mockResolvedValueOnce({ exists: () => false }); await expect(requirePurchasedExam('student-a', 'paid')).rejects.toThrow('chưa mua');
  mock.get.mockRejectedValueOnce(new Error('offline')); await expect(requirePurchasedExam('student-a', 'paid')).rejects.toThrow('Chưa xác minh');
});
it('rejects another student’s personal exam before any parent read', async () => {
  await expect(requireOfflineDownloadAccess('student-a', { id: 'personal', isPersonalRetake: true, creatorUid: 'other', originalExamId: 'paid' } as any)).rejects.toThrow('không thuộc'); expect(mock.get).not.toHaveBeenCalled();
});
