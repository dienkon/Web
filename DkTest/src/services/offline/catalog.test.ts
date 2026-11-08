import { beforeEach, expect, it, vi } from 'vitest';
const mock = vi.hoisted(() => ({ uid: 'student-a', get: vi.fn() }));
vi.mock('../firebase/config', () => ({ auth: { get currentUser() { return mock.uid ? { uid: mock.uid } : null; } }, db: {} }));
vi.mock('firebase/firestore', () => ({ collection: (_: any, name: string) => name, where: (...args: any[]) => ({ where: args }), orderBy: (...args: any[]) => ({ orderBy: args }), limit: (n: number) => ({ limit: n }), query: (...args: any[]) => args, getDocsFromServer: mock.get }));
import { getRecentMobileExams, findMobileExamByCode } from './catalog';
beforeEach(() => {
  vi.clearAllMocks(); mock.uid = 'student-a'; const entries = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (k: string) => entries.get(k) || null, setItem: (k: string, v: string) => entries.set(k, v) }); vi.stubGlobal('navigator', { onLine: true });
  mock.get.mockResolvedValue({ docs: [{ id: 'recent', data: () => ({ title: 'Gần nhất', updatedAt: { seconds: 1 }, password: 'private', questions: [{ secret: true }] }) }] });
});
it('limits the Firestore query to five published exams sorted by last edit', async () => {
  const items = await getRecentMobileExams();
  expect(mock.get).toHaveBeenCalledWith(['exams', { where: ['status', '==', 'published'] }, { orderBy: ['updatedAt', 'desc'] }, { limit: 5 }]);
  expect(items[0]).not.toHaveProperty('questions'); expect(items[0]).not.toHaveProperty('password');
});
it('reuses the UID cache and deduplicates simultaneous mounts', async () => {
  await Promise.all([getRecentMobileExams(), getRecentMobileExams()]); await getRecentMobileExams(); expect(mock.get).toHaveBeenCalledTimes(1);
  await getRecentMobileExams(true); expect(mock.get).toHaveBeenCalledTimes(2);
});
it('isolates accounts and does not read Firestore when offline', async () => {
  await getRecentMobileExams(); mock.uid = 'student-b'; await getRecentMobileExams(); expect(mock.get).toHaveBeenCalledTimes(2);
  vi.stubGlobal('navigator', { onLine: false }); await getRecentMobileExams(true); expect(mock.get).toHaveBeenCalledTimes(2);
});
it('never falls back to an unbounded query when an index is missing', async () => {
  mock.get.mockRejectedValueOnce(new Error('missing index')); await expect(getRecentMobileExams()).rejects.toThrow('missing index'); expect(mock.get).toHaveBeenCalledTimes(1);
});
it('only searches one published exam on an explicit code search', async () => {
  expect(await findMobileExamByCode(' ABC ')).toBe('recent'); expect(mock.get).toHaveBeenCalledWith(['exams', { where: ['code', '==', 'ABC'] }, { where: ['status', '==', 'published'] }, { limit: 1 }]);
});
