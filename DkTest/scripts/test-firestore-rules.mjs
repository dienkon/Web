import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import assert from 'node:assert/strict';
import { initializeApp, deleteApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { migratePaidInlineExam } from './lib/migrate-paid-content.mjs';
if (!process.env.FIRESTORE_EMULATOR_HOST) throw new Error('Run via Firebase emulator; never use production.');
const env = await initializeTestEnvironment({ projectId: 'demo-dktest-audit', firestore: { rules: readFileSync('firestore.rules', 'utf8') } });
const adminApp = initializeApp({ projectId: 'demo-dktest-audit' }, 'migration-audit');
const privileged = getFirestore(adminApp);
let assertions = 0;
const pass = async (promise) => { await assertSucceeds(promise); assertions++; };
const deny = async (promise) => { await assertFails(promise); assertions++; };
try {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    for (const [path, value] of Object.entries({
      'users/student-a': { uid: 'student-a', role: 'student', accountStatus: 'active' },
      'users/student-b': { uid: 'student-b', role: 'student', accountStatus: 'active' },
      'exams/paid': { status: 'published', accessMode: 'paid', priceVnd: 10000 },
      'exams/free': { status: 'published', accessMode: 'free', priceVnd: 0 },
      'exams/paid/questions/q': { text: 'paid content' },
      'exams/free/questions/q': { text: 'free content' },
      'exams/paid/sections/s': { title: 'paid section' },
      'wallets/student-a': { uid: 'student-a', balanceVnd: 100000 },
      'exam_entitlements/student-b_paid': { uid: 'student-b', examId: 'paid', status: 'active' },
      'exams/legacy-embedded': { status: 'published', accessMode: 'paid', priceVnd: 10000, updatedAt: 1, questions: [{ id: 'q', text: 'legacy inline question' }] },
      'exams/legacy-conflict': { accessMode: 'paid', questions: [{ id: 'q', text: 'old root' }] },
      'exams/legacy-conflict/questions/q': { id: 'q', examId: 'legacy-conflict', text: 'newer subcollection' },
      'courses/free-course': { status: 'published', accessMode: 'free', priceVnd: 0, freePreviewCount: 0, unlockFullPolicy: 'unlock_all_videos' },
      'courses/free-course/lessons/l1': { id: 'l1', courseId: 'free-course', order: 0, accessType: 'inherit_first_n', includedInCourseUnlock: true, videoUrl: 'https://youtu.be/free' },
      'courses/paid-course': { status: 'published', accessMode: 'paid', priceVnd: 250000, freePreviewCount: 1, unlockFullPolicy: 'unlock_course_only' },
      'courses/paid-course/lessons/l0': { id: 'l0', courseId: 'paid-course', order: 0, accessType: 'inherit_first_n', includedInCourseUnlock: true, videoUrl: 'https://youtu.be/preview0' },
      'courses/paid-course/lessons/l1': { id: 'l1', courseId: 'paid-course', order: 1, accessType: 'inherit_first_n', includedInCourseUnlock: true, videoUrl: 'https://youtu.be/paid1' },
      'courses/paid-course/lessons/l_vip': { id: 'l_vip', courseId: 'paid-course', order: 2, accessType: 'paid', includedInCourseUnlock: false, videoUrl: 'https://youtu.be/vip_only' },
      'courses/per-video-course': { status: 'published', accessMode: 'per_video', priceVnd: 0, freePreviewCount: 1, unlockFullPolicy: 'unlock_all_videos' },
      'courses/per-video-course/lessons/pv0': { id: 'pv0', courseId: 'per-video-course', order: 0, accessType: 'inherit_first_n', priceVnd: 0, includedInCourseUnlock: true, videoUrl: 'https://youtu.be/pv0' },
      'courses/per-video-course/lessons/pv1': { id: 'pv1', courseId: 'per-video-course', order: 1, accessType: 'inherit_first_n', priceVnd: 25000, includedInCourseUnlock: true, videoUrl: 'https://youtu.be/pv1' },
    })) await setDoc(doc(db, path), value);
  });
  const a = env.authenticatedContext('student-a').firestore();
  const b = env.authenticatedContext('student-b').firestore();
  const anonymous = env.unauthenticatedContext().firestore();
  const admin = env.authenticatedContext('admin', { role: 'admin' }).firestore();
  await deny(setDoc(doc(a, 'exam_entitlements/student-a_paid'), { uid: 'student-a', examId: 'paid', status: 'active' }));
  await deny(getDoc(doc(a, 'exam_entitlements/student-b_paid')));
  await deny(getDocs(collection(a, 'exams/paid/questions')));
  await deny(getDoc(doc(a, 'exams/paid/sections/s')));
  await pass(getDocs(collection(b, 'exams/paid/questions')));
  await pass(getDocs(collection(a, 'exams/free/questions')));
  await deny(getDocs(collection(anonymous, 'exams/free/questions')));
  await pass(getDoc(doc(a, 'wallets/student-a')));
  await deny(updateDoc(doc(a, 'wallets/student-a'), { balanceVnd: 999999999 }));
  await deny(getDoc(doc(b, 'wallets/student-a')));
  await deny(getDoc(doc(anonymous, 'wallets/student-a')));
  await pass(setDoc(doc(admin, 'exam_entitlements/student-a_paid'), { uid: 'student-a', examId: 'paid', status: 'active' }));
  await pass(getDocs(collection(a, 'exams/paid/questions')));
  await deny(setDoc(doc(admin, 'exams/new-paid-inline'), { accessMode: 'paid', priceVnd: 1000, questions: [{ text: 'private bank' }] }));
  await pass(setDoc(doc(admin, 'exams/new-paid-metadata'), { accessMode: 'paid', priceVnd: 1000, title: 'Metadata only' }));
  await deny(getDoc(doc(a, 'exam_content_migration_backups/legacy-embedded')));
  await deny(updateDoc(doc(a, 'users/student-a'), { role: 'admin' }));
  await deny(updateDoc(doc(a, 'users/student-a'), { accountStatus: 'active', role: 'super_admin' }));
  await deny(setDoc(doc(env.authenticatedContext('attacker').firestore(), 'users/attacker'), { role: 'admin', accountStatus: 'active' }));
  await pass(setDoc(doc(a, 'submissions/attempt-a'), { studentUid: 'student-a', studentId: 'student-a', score: 5 }));
  await deny(updateDoc(doc(a, 'submissions/attempt-a'), { score: 10 }));
  await pass(updateDoc(doc(a, 'submissions/attempt-a'), { aiAnalysis: { text: 'cached' } }));
  await deny(getDoc(doc(b, 'submissions/attempt-a')));
  // Explicitly retain evidence of the legacy root-document limitation in the audit.
  const legacy = await getDoc(doc(a, 'exams/legacy-embedded'));
  if (legacy.data()?.questions?.length) console.warn('PRE-MIGRATION SCHEMA RISK reproduced: legacy root paid content readable.');
  assert.equal(await migratePaidInlineExam(privileged, privileged.doc('exams/legacy-embedded')), true); assertions++;
  const migrated = await getDoc(doc(a, 'exams/legacy-embedded'));
  assert.equal(migrated.data().questions, undefined); assert.equal(migrated.data().updatedAt, 1); assertions++;
  await deny(getDocs(collection(a, 'exams/legacy-embedded/questions')));
  assert.equal((await privileged.doc('exam_content_migration_backups/legacy-embedded').get()).data().original.questions[0].text, 'legacy inline question'); assertions++;
  assert.equal(await migratePaidInlineExam(privileged, privileged.doc('exams/legacy-embedded')), false); assertions++;
  await assert.rejects(migratePaidInlineExam(privileged, privileged.doc('exams/legacy-conflict')), /conflict/); assertions++;
  assert.equal((await privileged.doc('exams/legacy-conflict').get()).data().questions[0].text, 'old root'); assertions++;
  assert.equal((await privileged.doc('exam_content_migration_backups/legacy-conflict').get()).exists, false); assertions++;

  // Courses & fine-grained video lesson entitlements
  await pass(getDoc(doc(a, 'courses/paid-course')));
  await pass(getDoc(doc(a, 'courses/free-course/lessons/l1')));
  await deny(getDoc(doc(anonymous, 'courses/free-course/lessons/l1')));
  await pass(getDoc(doc(a, 'courses/paid-course/lessons/l0'))); // First video free preview
  await deny(getDoc(doc(a, 'courses/paid-course/lessons/l1'))); // Paid lesson locked
  await deny(setDoc(doc(a, 'course_entitlements/student-a_paid-course'), { uid: 'student-a', courseId: 'paid-course', scope: 'course', status: 'active' }));
  await deny(setDoc(doc(admin, 'courses/bad-inline'), { status: 'published', accessMode: 'paid', lessons: [{ videoUrl: 'leak' }] }));
  await pass(setDoc(doc(admin, 'course_entitlements/student-a_paid-course'), { uid: 'student-a', courseId: 'paid-course', scope: 'course', status: 'active' }));
  await pass(getDoc(doc(a, 'courses/paid-course/lessons/l1'))); // Unlocked by course entitlement
  await deny(getDoc(doc(a, 'courses/paid-course/lessons/l_vip'))); // VIP excluded under unlock_course_only
  await pass(setDoc(doc(admin, 'course_entitlements/student-a_paid-course__l_vip'), { uid: 'student-a', courseId: 'paid-course', lessonId: 'l_vip', scope: 'lesson', status: 'active' }));
  await pass(getDoc(doc(a, 'courses/paid-course/lessons/l_vip'))); // Unlocked by single lesson entitlement
  await deny(getDoc(doc(b, 'course_entitlements/student-a_paid-course')));

  // Per-video billing mode: course priceVnd is 0, yet paid lessons remain strictly locked!
  await pass(getDoc(doc(a, 'courses/per-video-course/lessons/pv0'))); // First video free preview
  await deny(getDoc(doc(a, 'courses/per-video-course/lessons/pv1'))); // Per-video paid lesson must NOT leak!
  await pass(setDoc(doc(admin, 'course_entitlements/student-a_per-video-course__pv1'), { uid: 'student-a', courseId: 'per-video-course', lessonId: 'pv1', scope: 'lesson', status: 'active' }));
  await pass(getDoc(doc(a, 'courses/per-video-course/lessons/pv1'))); // Unlocked after single video payment

  // Arena rooms must be completely blocked on Firestore (moved strictly to RTDB -> 0 Firestore reads/writes)
  await deny(getDocs(collection(a, 'arena_rooms')));
  await deny(getDoc(doc(a, 'arena_rooms/room_test')));
  await deny(setDoc(doc(a, 'arena_rooms/room_test'), { id: 'room_test', roomCode: 'ABC123', status: 'waiting' }));
  await deny(getDocs(collection(admin, 'arena_rooms')));

  // Document Library security boundaries (v2.0.7)
  await pass(setDoc(doc(admin, 'library_documents/free-doc'), {
    id: 'free-doc',
    title: 'Free Math 12',
    status: 'published',
    accessMode: 'free',
    priceVnd: 0,
    fileUrl: 'https://res.cloudinary.com/dys3wgutz/raw/upload/v1/free_blob?dkext=pdf',
    authorUid: 'admin',
  }));
  await pass(getDoc(doc(anonymous, 'library_documents/free-doc')));
  await pass(getDoc(doc(a, 'library_documents/free-doc')));
  await deny(setDoc(doc(a, 'library_documents/spoof-doc'), { id: 'spoof-doc', status: 'published', accessMode: 'free', priceVnd: 0 }));

  // Paid document metadata must NEVER embed fileUrl / answerUrl / subFiles directly in library_documents
  await deny(setDoc(doc(admin, 'library_documents/paid-leak'), {
    id: 'paid-leak',
    title: 'Paid Doc Leak Attempt',
    status: 'published',
    accessMode: 'paid',
    priceVnd: 20000,
    fileUrl: 'https://res.cloudinary.com/dys3wgutz/raw/upload/v1/secret_paid',
  }));
  await pass(setDoc(doc(admin, 'library_documents/paid-safe'), {
    id: 'paid-safe',
    title: 'Paid Doc Safe Metadata',
    status: 'published',
    accessMode: 'paid',
    priceVnd: 20000,
    authorUid: 'student-b',
  }));
  await pass(setDoc(doc(admin, 'library_document_secrets/paid-safe'), {
    docId: 'paid-safe',
    fileUrl: 'https://res.cloudinary.com/dys3wgutz/raw/upload/v1/secret_paid?dkext=pdf',
  }));
  // Neither anonymous nor students (not even author directly via client SDK) can read library_document_secrets
  await deny(getDoc(doc(anonymous, 'library_document_secrets/paid-safe')));
  await deny(getDoc(doc(a, 'library_document_secrets/paid-safe')));
  await deny(getDoc(doc(b, 'library_document_secrets/paid-safe')));
  await pass(getDoc(doc(admin, 'library_document_secrets/paid-safe')));

  // Entitlements strictly server/admin writable, owner readable
  await deny(setDoc(doc(a, 'library_entitlements/student-a_paid-safe'), { uid: 'student-a', docId: 'paid-safe', status: 'active' }));
  await pass(setDoc(doc(admin, 'library_entitlements/student-a_paid-safe'), { uid: 'student-a', docId: 'paid-safe', status: 'active' }));
  await pass(getDoc(doc(a, 'library_entitlements/student-a_paid-safe')));
  await deny(getDoc(doc(b, 'library_entitlements/student-a_paid-safe')));

  console.log(`Firestore emulator: ${assertions} authorization assertions passed (production not modified).`);
} finally { await env.cleanup(); await deleteApp(adminApp); }
