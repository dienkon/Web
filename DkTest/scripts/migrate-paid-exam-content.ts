import 'dotenv/config';
import { FieldPath } from 'firebase-admin/firestore';
import { migratePaidInlineExam } from "./lib/migrate-paid-content.mjs";
import { adminDb } from '../server/firebaseAdmin';

// Dry-run by default. Requires privileged Admin SDK; never falls back to anonymous REST.
const apply = process.argv.includes('--apply');
const project = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || 'exam-fd7a1';
if (!adminDb) throw new Error('Cần cấu hình Admin SDK có quyền; không thực hiện bằng REST ẩn danh.');
if (apply && !process.argv.includes(`--confirm-project=${project}`)) throw new Error(`Để áp dụng, xác nhận --confirm-project=${project}.`);
let cursor: any;
let scanned = 0;
let migrated = 0;
do {
  let request = adminDb.collection('exams').orderBy(FieldPath.documentId()).limit(100);
  if (cursor) request = request.startAfter(cursor);
  const page = await request.get();
  if (page.empty) break;
  for (const item of page.docs) {
    scanned++;
    const source = item.data();
    if (!(source.accessMode === 'paid' || Number(source.priceVnd || 0) > 0) || (!source.questions?.length && !source.sections?.length)) continue;
    console.log(`${apply ? 'APPLY' : 'DRY RUN'} ${item.id}: ${source.questions?.length || 0} questions, ${source.sections?.length || 0} sections`);
    if (!apply) continue;
    await migratePaidInlineExam(adminDb, item.ref);
    migrated++;
  }
  cursor = page.docs.at(-1);
} while (cursor);
console.log(JSON.stringify({ project, mode: apply ? 'apply' : 'dry-run', scanned, migrated }));
