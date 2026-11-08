import { openDB, type DBSchema } from 'idb';
import type { Exam, Question, Section, Submission } from '../../types';
import type { ActiveExamSession } from '../examSessionService';

export interface OfflineDraft {
  key: string;
  uid: string;
  examId: string;
  session: ActiveExamSession;
  snapshot: Record<string, any>;
}

export interface OfflineExam {
  key: string;
  uid: string;
  exam: Exam;
  questions: Question[];
  sections: Section[];
  media: Record<string, Blob>;
  downloadedAt: number;
  serverSubmissionIds: string[];
}

export interface LocalSubmission {
  id: string;
  uid: string;
  submission: Submission;
  state: 'pending' | 'synced' | 'error';
  error?: string;
  savedAt: number;
}

interface OfflineSchema extends DBSchema {
  exams: { key: string; value: OfflineExam; indexes: { uid: string } };
  submissions: { key: string; value: LocalSubmission; indexes: { uid: string } };
  drafts: { key: string; value: OfflineDraft };
}

let database: ReturnType<typeof openDB<OfflineSchema>> | undefined;
function db() {
  return database ??= openDB<OfflineSchema>('dktest-offline-v1', 2, {
    upgrade(database) {
      if (!database.objectStoreNames.contains('exams')) database.createObjectStore('exams', { keyPath: 'key' }).createIndex('uid', 'uid');
      if (!database.objectStoreNames.contains('submissions')) database.createObjectStore('submissions', { keyPath: 'id' }).createIndex('uid', 'uid');
      if (!database.objectStoreNames.contains('drafts')) database.createObjectStore('drafts', { keyPath: 'key' });
    },
  });
}

export const offlineStore = {
  async saveDraft(value: OfflineDraft) {
    const tx = (await db()).transaction('drafts', 'readwrite', { durability: 'strict' });
    await tx.store.put(value); await tx.done;
  },
  async getDraft(uid: string, examId: string) { return (await db()).get('drafts', `${uid}:${examId}`); },
  async deleteDraft(uid: string, examId: string) { await (await db()).delete('drafts', `${uid}:${examId}`); },
  async saveExam(value: OfflineExam) { await (await db()).put('exams', value); },
  async getExam(uid: string, examId: string) { return (await db()).get('exams', `${uid}:${examId}`); },
  async listExams(uid: string) { return (await db()).getAllFromIndex('exams', 'uid', uid); },
  async deleteExam(uid: string, examId: string) { await (await db()).delete('exams', `${uid}:${examId}`); },
  async getSubmission(id: string) { return (await db()).get('submissions', id); },
  async refreshSubmission(id: string, submission: Submission) {
    const tx = (await db()).transaction('submissions', 'readwrite');
    const previous = await tx.store.get(id);
    if (previous?.state === 'synced') await tx.store.put({ ...previous, submission });
    await tx.done;
  },
  async listSubmissions(uid: string) { return (await db()).getAllFromIndex('submissions', 'uid', uid); },
  // One transaction makes a retry return the original immutable attempt, including after restart.
  async enqueue(value: LocalSubmission) {
    const tx = (await db()).transaction('submissions', 'readwrite', { durability: 'strict' });
    const existing = await tx.store.get(value.id);
    if (existing && existing.uid !== value.uid) throw new Error('Bài làm thuộc tài khoản khác.');
    if (!existing) await tx.store.add(value);
    await tx.done;
    return existing || value;
  },
  async mark(id: string, state: LocalSubmission['state'], error = '') {
    const tx = (await db()).transaction('submissions', 'readwrite', { durability: 'strict' });
    const value = await tx.store.get(id);
    if (value) await tx.store.put({ ...value, state, error });
    await tx.done;
  },
};
