import { collection, doc, getDocFromServer, getDocsFromServer, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import { getApiBaseUrl } from '../apiClient';
import { checkExamAccess } from '../walletClientService';
import { activateOfflineMedia, collectMediaUrls } from './media';
import { offlineStore, type OfflineExam } from './store';
import type { Exam, Question, Section } from '../../types';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

export function prefersOfflineExam() {
  return (typeof navigator !== 'undefined' && navigator.onLine === false)
    || (typeof location !== 'undefined' && new URLSearchParams(location.search).get('offline') === '1');
}

export async function loadOfflineExam(examId: string) {
  const uid = auth.currentUser?.uid;
  if (!uid) return undefined;
  const pack = await offlineStore.getExam(uid, examId);
  if (pack) activateOfflineMedia(pack.media, `${pack.key}:${pack.downloadedAt}`);
  return pack;
}

export async function countOfflineAttempts(pack: OfflineExam) {
  const local = await offlineStore.listSubmissions(pack.uid);
  return new Set([...pack.serverSubmissionIds, ...local.filter((s) => s.submission.examId === pack.exam.id).map((s) => s.id)]).size;
}

export async function downloadOfflineExam(examId: string, progress: (text: string) => void = () => {}) {
  const user = auth.currentUser;
  if (!user || !navigator.onLine) throw new Error('Cần đăng nhập và có mạng để tải đề lần đầu.');
  progress('Đang kiểm tra đề và quyền truy cập…');
  const snapshot = await getDocFromServer(doc(db, 'exams', examId));
  if (!snapshot.exists()) throw new Error('Không tìm thấy đề thi.');
  const exam = { ...snapshot.data(), id: snapshot.id } as Exam;
  if ((exam as any).examType === 'code') throw new Error('Đề lập trình cần môi trường chạy trực tuyến.');
  if ((exam as any).status && exam.status !== 'published') throw new Error('Đề chưa được phát hành.');
  // Access is granted online before persisting a private copy; never bypass paid/personal gates.
  const personal = exam.isRetake || exam.isAggregatedReview || (exam as any).isPersonalRetake;
  if (exam.accessMode === 'paid' || exam.priceVnd > 0 || personal) {
    const access = await checkExamAccess(examId);
    if (!access.hasAccess) throw new Error(access.message || 'Bạn cần mở khóa đề này khi có mạng.');
  }
  const [questionsSnapshot, sectionsSnapshot, submissionsSnapshot] = await Promise.all([
    getDocsFromServer(collection(db, `exams/${examId}/questions`)),
    getDocsFromServer(collection(db, `exams/${examId}/sections`)),
    getDocsFromServer(query(collection(db, 'submissions'), where('studentUid', '==', user.uid))),
  ]);
  const embedded = exam as any;
  const questions = (embedded.questions?.length ? embedded.questions : questionsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id }))) as Question[];
  const sections = (embedded.sections?.length ? embedded.sections : sectionsSnapshot.docs.map((d) => ({ ...d.data(), id: d.id }))) as Section[];
  if (!questions.length) throw new Error('Đề chưa có câu hỏi để tải.');
  const urls = collectMediaUrls({ exam, questions, sections });
  const media: Record<string, Blob> = {};
  for (const [index, url] of urls.entries()) {
    progress(`Đang tải hình/âm thanh/tệp ${index + 1}/${urls.length}…`);
    const remote = new URL(url, getApiBaseUrl() || location.origin).href;
    let blob: Blob;
    if (Capacitor.getPlatform() === 'android') {
      // Static files on the website/CDN may not have browser CORS headers. Download via
      // the native HTTP API without globally patching Firebase's streaming transport.
      const response = await CapacitorHttp.get({ url: remote, responseType: 'arraybuffer', connectTimeout: 20000, readTimeout: 60000 });
      if (response.status < 200 || response.status >= 300 || typeof response.data !== 'string') throw new Error(`Không tải được tài nguyên (${response.status}).`);
      const type = Object.entries(response.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1] || 'application/octet-stream';
      blob = new Blob([Uint8Array.from(atob(response.data.replace(/\s/g, '')), (char) => char.charCodeAt(0))], { type });
    } else {
      const response = await fetch(remote, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Không tải được tài nguyên (${response.status}). Đề chưa được lưu, hãy thử lại.`);
      blob = await response.blob();
    }
    if (!blob.size || /text\/html/i.test(blob.type)) throw new Error('Đề có liên kết web cần mạng hoặc tài nguyên không hợp lệ. Chưa thể tải đầy đủ để làm offline.');
    media[url] = blob;
  }
  if (auth.currentUser?.uid !== user.uid) throw new Error('Tài khoản đã thay đổi. Hãy tải lại đề.');
  const pack: OfflineExam = {
    key: `${user.uid}:${examId}`, uid: user.uid, exam, questions, sections, media,
    downloadedAt: Date.now(),
    serverSubmissionIds: submissionsSnapshot.docs.filter((s) => s.data().examId === examId).map((s) => s.id),
  };
  progress('Đang lưu đề vào thiết bị…');
  // Atomic replacement: a failed refresh keeps the previous complete version available.
  await offlineStore.saveExam(pack);
  await navigator.storage?.persist?.().catch(() => false);
  return pack;
}
