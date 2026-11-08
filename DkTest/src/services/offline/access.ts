import { doc, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import type { Exam } from '../../types';

export const isPaidExam = (exam: Partial<Exam>) => exam.accessMode === 'paid' || Number(exam.priceVnd || 0) > 0;

export async function requirePurchasedExam(uid: string, examId: string) {
  if (auth.currentUser?.uid !== uid) throw new Error('Tài khoản đã thay đổi.');
  let entitlement;
  try { entitlement = await getDocFromServer(doc(db, 'exam_entitlements', `${uid}_${examId}`)); }
  catch { throw new Error('Chưa xác minh được quyền mua đề. Đề chưa được tải xuống.'); }
  const value = entitlement.exists() ? entitlement.data() : null;
  if (!value || value.status !== 'active' || value.uid !== uid || value.examId !== examId) {
    throw new Error('Bạn chưa mua hoặc chưa được cấp quyền đề này. Mở khóa đề khi có mạng trước khi tải xuống.');
  }
}

export async function requireOfflineDownloadAccess(uid: string, exam: Exam) {
  // Fresh reads authenticated by Firebase, with no wallet balance/API/header fallback.
  if (isPaidExam(exam)) await requirePurchasedExam(uid, exam.id);
  const personal = (exam as any).isPersonalRetake || exam.isAggregatedReview || (exam.isRetake && exam.creatorRole === 'student');
  if (personal) {
    if ((exam as any).creatorUid !== uid && (exam as any).allowedUid !== uid && exam.ownerId !== uid) {
      throw new Error('Đề cá nhân không thuộc tài khoản của bạn hoặc thiếu thông tin chủ sở hữu.');
    }
    const parents = [...new Set([exam.originalExamId, ...(exam.sourceExamIds || [])].filter(Boolean))];
    if (parents.length > 10 || ((exam as any).isDerivedFromPaidExam && !parents.length)) throw new Error('Nguồn đề cá nhân chưa hợp lệ để tải offline.');
    for (const id of parents) {
      const source = await getDocFromServer(doc(db, 'exams', id));
      if (!source.exists()) throw new Error('Không xác minh được đề gốc.');
      if (isPaidExam(source.data())) await requirePurchasedExam(uid, id);
    }
  }
  if (auth.currentUser?.uid !== uid) throw new Error('Tài khoản đã thay đổi.');
}
