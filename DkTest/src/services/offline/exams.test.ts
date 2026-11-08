import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineStore } from './store';
import { countOfflineAttempts, downloadOfflineExam } from './exams';

const mocks = vi.hoisted(() => ({ user: { uid: 'a' } as any, getDoc: vi.fn(), getDocs: vi.fn(), access: vi.fn() }));
vi.mock('../firebase/config', () => ({ auth: { get currentUser() { return mocks.user; } }, db: {} }));
vi.mock('../apiClient', () => ({ getApiBaseUrl: () => 'https://dktest.test' }));
vi.mock('../walletClientService', () => ({ checkExamAccess: mocks.access }));
vi.mock('firebase/firestore', () => ({
  doc: (_db: any, _collection: any, id: any) => id,
  collection: (_db: any, path: any) => path,
  query: (...args: any[]) => args,
  where: (...args: any[]) => args,
  getDocFromServer: mocks.getDoc,
  getDocsFromServer: mocks.getDocs,
}));

beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubGlobal('navigator', { onLine: true, storage: { persist: async () => true } });
  vi.stubGlobal('location', { origin: 'https://localhost', search: '' });
  vi.stubGlobal('fetch', vi.fn(async () => new Response('image-bytes', { headers: { 'Content-Type': 'image/png' } })));
  mocks.user = { uid: 'a' };
  mocks.access.mockResolvedValue({ hasAccess: true });
  mocks.getDoc.mockResolvedValue({ id: 'exam', exists: () => true, data: () => ({ title: 'Đề gốc', status: 'published', maxAttempts: 3 }) });
  mocks.getDocs.mockImplementation(async (path: any) => ({ docs: typeof path === 'string' && path.endsWith('/questions') ? [{ id: 'q1', data: () => ({ text: '![hình](/image.png)', type: 'single_choice' }) }] : [] }));
  await offlineStore.listExams('a');
  const db = await openDB('dktest-offline-v1');
  await db.clear('exams'); await db.clear('submissions'); db.close();
});

describe('online preparation for a true offline cold start', () => {
  it('stores a complete package with actual media blobs after all requests succeed', async () => {
    await downloadOfflineExam('exam');
    const pack = await offlineStore.getExam('a', 'exam');
    expect(pack?.questions[0].text).toContain('/image.png');
    expect(await pack?.media['/image.png'].text()).toBe('image-bytes');
    expect(fetch).toHaveBeenCalledWith('https://dktest.test/image.png', expect.any(Object));
  });
  it('keeps the previous complete package after a partial media download fails', async () => {
    await downloadOfflineExam('exam');
    const previous = await offlineStore.getExam('a', 'exam');
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network lost'));
    await expect(downloadOfflineExam('exam')).rejects.toThrow('network lost');
    expect((await offlineStore.getExam('a', 'exam'))?.downloadedAt).toBe(previous?.downloadedAt);
  });
  it('never marks an HTML link/error page as offline-ready media', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('<html>not a file</html>', { headers: { 'Content-Type': 'text/html' } }));
    await expect(downloadOfflineExam('exam')).rejects.toThrow('Chưa thể tải đầy đủ');
    expect(await offlineStore.getExam('a', 'exam')).toBeUndefined();
  });
  it('does not download paid content without a successful online access check', async () => {
    mocks.getDoc.mockResolvedValueOnce({ id: 'exam', exists: () => true, data: () => ({ priceVnd: 10000, status: 'published' }) });
    mocks.access.mockResolvedValueOnce({ hasAccess: false, message: 'Cần mở khóa' });
    await expect(downloadOfflineExam('exam')).rejects.toThrow('Cần mở khóa');
    expect(mocks.getDocs).not.toHaveBeenCalled();
    expect(await offlineStore.getExam('a', 'exam')).toBeUndefined();
  });
  it('does not save content for a user who switches accounts during a download', async () => {
    vi.mocked(fetch).mockImplementationOnce(async () => { mocks.user = { uid: 'b' }; return new Response('image'); });
    await expect(downloadOfflineExam('exam')).rejects.toThrow('Tài khoản đã thay đổi');
    expect(await offlineStore.getExam('a', 'exam')).toBeUndefined();
    expect(await offlineStore.getExam('b', 'exam')).toBeUndefined();
  });
  it('counts server and local attempts without counting a synced ID twice', async () => {
    await downloadOfflineExam('exam');
    const pack = (await offlineStore.getExam('a', 'exam'))!;
    pack.serverSubmissionIds = ['one'];
    await offlineStore.enqueue({ id: 'one', uid: 'a', state: 'synced', savedAt: 1, submission: { examId: 'exam' } as any });
    await offlineStore.enqueue({ id: 'two', uid: 'a', state: 'pending', savedAt: 2, submission: { examId: 'exam' } as any });
    expect(await countOfflineAttempts(pack)).toBe(2);
  });
});
