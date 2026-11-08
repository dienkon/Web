import 'fake-indexeddb/auto';
import { openDB } from 'idb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { offlineStore, type LocalSubmission } from './store';
import { collectMediaUrls } from './media';
import { firestoreValue, uploadOfflineSubmission } from './firestoreRest';
import { saveActiveExamSession, getActiveExamSession, hasActiveExamInProgress, clearActiveExamSession } from '../examSessionService';

const state = vi.hoisted(() => ({ currentUser: { uid: 'student-a', getIdToken: async () => 'test-token' } as any }));
vi.mock('../firebase/config', () => ({ auth: state, app: { options: { projectId: 'test-project' } } }));
import { queueSubmission, syncOfflineSubmissions } from './sync';

function record(id = 'sub_attempt_1800000000000'): LocalSubmission {
  return { id, uid: 'student-a', state: 'pending', savedAt: 1800000000000,
    submission: { id, studentUid: 'student-a', attemptId: 'attempt_1800000000000', examId: 'exam-a', answers: { q1: ['a'], q2: 'bài tự luận' }, score: 5 } as any };
}

beforeEach(async () => {
  vi.stubGlobal('navigator', { onLine: false });
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('fetch', vi.fn());
  const values = new Map<string, string>();
  vi.stubGlobal('localStorage', { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) });
  state.currentUser = { uid: 'student-a', getIdToken: async () => 'test-token' };
  await syncOfflineSubmissions();
  const db = await openDB('dktest-offline-v1');
  await db.clear('submissions'); await db.clear('exams'); await db.clear('drafts'); db.close();
});

describe('durable offline submissions', () => {
  it('acknowledges a durable copy offline without any network request', async () => {
    const original = record();
    const saved = await queueSubmission(original.submission);
    expect(saved.answers).toEqual(original.submission.answers);
    const independentConnection = await openDB('dktest-offline-v1');
    expect((await independentConnection.get('submissions', original.id)).submission.answers).toEqual(original.submission.answers);
    independentConnection.close();
    expect(fetch).not.toHaveBeenCalled();
  });
  it('keeps the first attempt immutable across repeated submit calls', async () => {
    const original = record();
    await offlineStore.enqueue(original);
    await offlineStore.enqueue({ ...original, submission: { ...original.submission, score: 10 } });
    expect((await offlineStore.getSubmission(original.id))?.submission.score).toBe(5);
    await expect(offlineStore.enqueue({ ...original, uid: 'student-b' })).rejects.toThrow('tài khoản khác');
  });
  it('retries a failed request on reconnection and marks synced only after server ACK', async () => {
    const original = record(); await offlineStore.enqueue(original);
    vi.stubGlobal('navigator', { onLine: true });
    vi.mocked(fetch).mockRejectedValueOnce(new Error('disconnected'));
    await syncOfflineSubmissions();
    expect((await offlineStore.getSubmission(original.id))?.state).toBe('error');
    expect((await offlineStore.getSubmission(original.id))?.submission.answers).toEqual(original.submission.answers);
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await syncOfflineSubmissions();
    expect((await offlineStore.getSubmission(original.id))?.state).toBe('synced');
    await syncOfflineSubmissions();
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('does not send another student’s queued submissions after account switching', async () => {
    await offlineStore.enqueue(record());
    state.currentUser = { uid: 'student-b', getIdToken: async () => 'other-token' };
    vi.stubGlobal('navigator', { onLine: true });
    await syncOfflineSubmissions();
    expect(fetch).not.toHaveBeenCalled();
    expect(await offlineStore.listSubmissions('student-b')).toEqual([]);
  });
  it('reports an authentication failure without removing the attempt', async () => {
    await offlineStore.enqueue(record());
    vi.stubGlobal('navigator', { onLine: true });
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 403 }));
    await syncOfflineSubmissions();
    const saved = await offlineStore.getSubmission(record().id);
    expect(saved?.state).toBe('error'); expect(saved?.error).toContain('từ chối quyền ghi');
    expect(saved?.submission.answers.q2).toBe('bài tự luận');
  });
});

describe('idempotent Firestore REST protocol', () => {
  it('creates without a read and preserves submission time instead of reconnection time', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 200 }));
    await uploadOfflineSubmission('project', 'token', record());
    const [, options] = vi.mocked(fetch).mock.calls[0];
    const write = JSON.parse(options!.body as string).writes[0];
    expect(write.currentDocument).toEqual({ exists: false });
    expect(write.update.fields.submittedAt.timestampValue).toBe(new Date(record().savedAt).toISOString());
    expect(write.update.fields.answers.mapValue.fields.q2.stringValue).toBe('bài tự luận');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([409, 412])('accepts lost ACK (%i) without overwriting teacher grading', async (status) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status }));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ fields: {
      studentUid: { stringValue: 'student-a' }, attemptId: { stringValue: record().submission.attemptId }, score: { doubleValue: 9 },
    } }), { status: 200 }));
    await uploadOfflineSubmission('project', 'token', record());
    expect(vi.mocked(fetch).mock.calls.map(([, options]) => options?.method || 'GET')).toEqual(['POST', 'GET']);
  });
  it('rejects a conflict that belongs to a different attempt', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('{}', { status: 409 }));
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ fields: { studentUid: { stringValue: 'student-b' } } }), { status: 200 }));
    await expect(uploadOfflineSubmission('project', 'token', record())).rejects.toThrow('đã tồn tại');
  });
  it('encodes mixed question answers, null and nested values without losing types', () => {
    expect(firestoreValue({ tf: { a: true, b: false }, blank: ['0,5', '2'], essay: null })).toEqual({ mapValue: { fields: {
      tf: { mapValue: { fields: { a: { booleanValue: true }, b: { booleanValue: false } } } },
      blank: { arrayValue: { values: [{ stringValue: '0,5' }, { stringValue: '2' }] } }, essay: { nullValue: null },
    } } });
  });
});

describe('complete offline packages', () => {
  it('finds image, audio, attachment, Markdown and CSS resources, excluding embedded data', () => {
    expect(collectMediaUrls({ content: '![hình](/image.png) <img src="https://x.test/a?a=1&amp;b=2">', audioConfig: { url: 'https://x.test/listening.mp3' }, attachments: [{ fileData: 'https://x.test/file.pdf' }], inline: '<img src="data:image/png;base64,AA">', css: 'background:url(/chart.svg)' })).toEqual(['/image.png', 'https://x.test/a?a=1&b=2', 'https://x.test/listening.mp3', 'https://x.test/file.pdf', '/chart.svg']);
  });
  it('separates downloaded exams by UID and preserves the previous complete version', async () => {
    const original = { key: 'student-a:exam-a', uid: 'student-a', exam: { id: 'exam-a', title: 'Đề đủ' }, questions: [{ id: 'q1' }], sections: [], media: {}, downloadedAt: 1, serverSubmissionIds: [] } as any;
    await offlineStore.saveExam(original);
    expect(await offlineStore.getExam('student-b', 'exam-a')).toBeUndefined();
    expect((await offlineStore.getExam('student-a', 'exam-a'))?.exam.title).toBe('Đề đủ');
    await offlineStore.deleteExam('student-b', 'exam-a');
    expect(await offlineStore.getExam('student-a', 'exam-a')).toBeDefined();
  });
});

describe('draft recovery and exam clocks', () => {
  const student = (username: string) => localStorage.setItem('student_info', JSON.stringify({ username, uid: username }));
  it('keeps an expired attempt available for auto-submission instead of resetting its clock', () => {
    student('timer-user');
    const originalStart = Date.now() - 120000;
    saveActiveExamSession({ examId: 'expired-exam', studentUsername: 'timer-user', studentName: 'Thí sinh', startTime: originalStart, durationMinutes: 1, answers: { q1: 'a' } });
    expect(hasActiveExamInProgress('expired-exam')).toBeNull();
    const resumable = hasActiveExamInProgress('expired-exam', true);
    expect(resumable?.status).toBe('expired'); expect(resumable?.startTime).toBe(originalStart);
    expect(resumable?.answers.q1).toBe('a');
  });
  it('does not expire an unlimited attempt when reopening much later', () => {
    student('unlimited-user');
    saveActiveExamSession({ examId: 'unlimited-exam', studentUsername: 'unlimited-user', studentName: 'Thí sinh', startTime: Date.now() - 86400000, durationMinutes: 0, answers: { q1: 'a' } });
    expect(hasActiveExamInProgress('unlimited-exam')?.durationMinutes).toBe(0);
    expect(hasActiveExamInProgress('unlimited-exam')?.status).toBe('taking');
  });
  it('does not load or clear another student’s draft for the same exam', () => {
    student('draft-a');
    saveActiveExamSession({ examId: 'shared-exam', studentUsername: 'draft-a', studentName: 'A', startTime: Date.now(), durationMinutes: 30, answers: { q1: 'a' } });
    student('draft-b'); expect(getActiveExamSession('shared-exam')).toBeNull();
    saveActiveExamSession({ examId: 'shared-exam', studentUsername: 'draft-b', studentName: 'B', startTime: Date.now(), durationMinutes: 30, answers: { q1: 'b' } });
    clearActiveExamSession('shared-exam', 'draft-b');
    expect(localStorage.getItem('dktest:session:shared-exam:draft-a')).not.toBeNull();
    student('draft-a'); expect(getActiveExamSession('shared-exam')?.answers.q1).toBe('a');
  });
  it('durably stores frozen questions together with the answer draft, scoped by UID', async () => {
    student('draft-owner');
    const session = saveActiveExamSession({ examId: 'frozen-exam', studentUsername: 'draft-owner', studentName: 'A', startTime: Date.now(), durationMinutes: 30, answers: { q1: 'a' } });
    await offlineStore.saveDraft({ key: 'draft-owner:frozen-exam', uid: 'draft-owner', examId: 'frozen-exam', session, snapshot: { shuffledQuestions: [{ id: 'q1', options: [{ id: 'b' }, { id: 'a' }] }] } });
    const copy = await offlineStore.getDraft('draft-owner', 'frozen-exam');
    expect(copy?.session.answers).toEqual({ q1: 'a' });
    expect(copy?.snapshot.shuffledQuestions[0].options[0].id).toBe('b');
    expect(await offlineStore.getDraft('someone-else', 'frozen-exam')).toBeUndefined();
  });
});
