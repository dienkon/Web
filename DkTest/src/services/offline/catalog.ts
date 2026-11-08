import { collection, getDocsFromServer, limit, orderBy, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { Exam } from '../../types';

export const MOBILE_CATALOG_LIMIT = 5;
export const MOBILE_CATALOG_TTL = 5 * 60 * 1000;
const inFlight = new Map<string, Promise<Exam[]>>();

// Only public metadata is kept in the small persistent cache; never questions/passwords.
const CATALOG_FIELDS = ['title', 'code', 'subject', 'gradeCategory', 'status', 'updatedAt', 'createdAt', 'accessMode', 'priceVnd', 'timeLimit', 'duration', 'questionCount', 'totalQuestions', 'description', 'examType', 'type', 'attemptCount', 'submissionsCount'] as const;
export function catalogMetadata(id: string, value: Record<string, any>): Exam {
  return Object.fromEntries([['id', id], ...CATALOG_FIELDS.filter((key) => value[key] !== undefined).map((key) => [key, value[key]])]) as unknown as Exam;
}

export function getRecentMobileExams(force = false): Promise<Exam[]> {
  const uid = auth.currentUser?.uid;
  if (!uid) return Promise.resolve([]);
  const key = `dktest_mobile_catalog_v2_${uid}`;
  try {
    const saved = JSON.parse(localStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.items) && (!navigator.onLine || (!force && Date.now() - saved.savedAt < MOBILE_CATALOG_TTL))) {
      return Promise.resolve(saved.items.slice(0, MOBILE_CATALOG_LIMIT).map((item: Exam) => catalogMetadata(item.id, item)));
    }
  } catch { /* An invalid cache must not trigger an unbounded fallback query. */ }
  if (!navigator.onLine) return Promise.resolve([]);
  if (inFlight.has(uid)) return inFlight.get(uid)!;
  const pending = (async () => {
    const snapshot = await getDocsFromServer(query(collection(db, 'exams'),
      where('status', '==', 'published'), orderBy('updatedAt', 'desc'), limit(MOBILE_CATALOG_LIMIT)));
    const items = snapshot.docs.map((item) => catalogMetadata(item.id, item.data()));
    if (auth.currentUser?.uid !== uid) throw new Error('Tài khoản đã thay đổi.');
    if (auth.currentUser?.uid === uid) {
      try { localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), items })); } catch { /* RAM deduplication still works if storage is full. */ }
    }
    return items;
  })().finally(() => inFlight.delete(uid));
  inFlight.set(uid, pending);
  return pending;
}

export async function findMobileExamByCode(code: string): Promise<string | null> {
  if (!auth.currentUser || !navigator.onLine) return null;
  const snapshot = await getDocsFromServer(query(collection(db, 'exams'), where('code', '==', code.trim()), where('status', '==', 'published'), limit(1)));
  return snapshot.docs[0]?.id || null;
}
