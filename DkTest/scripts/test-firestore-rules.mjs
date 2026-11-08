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
  console.log(`Firestore emulator: ${assertions} authorization assertions passed (production not modified).`);
} finally { await env.cleanup(); await deleteApp(adminApp); }
