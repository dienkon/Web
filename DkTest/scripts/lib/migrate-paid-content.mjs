import { FieldValue } from 'firebase-admin/firestore';

// One atomic transaction per exam. Caller must use a privileged Admin SDK.
export async function migratePaidInlineExam(database, reference) {
  return database.runTransaction(async (tx) => {
    const current = await tx.get(reference);
    const value = current.data();
    if (!value || !(value.accessMode === 'paid' || Number(value.priceVnd || 0) > 0)) return false;
    const entries = [];
    for (const kind of ['questions', 'sections']) {
      for (const row of value[kind] || []) {
        if (!row?.id || !/^[a-zA-Z0-9_-]+$/.test(row.id)) throw new Error(`${reference.id}: invalid ${kind} ID, nothing changed.`);
        entries.push({ ref: reference.collection(kind).doc(row.id), data: { ...row, examId: reference.id } });
      }
    }
    if (!entries.length) return false;
    if (entries.length > 450) throw new Error(`${reference.id}: >450 entries, nothing changed.`);
    if (new Set(entries.map((entry) => entry.ref.path)).size !== entries.length) throw new Error(`${reference.id}: duplicate IDs, nothing changed.`);
    const existing = await tx.getAll(...entries.map((entry) => entry.ref));
    for (const [index, snapshot] of existing.entries()) {
      if (snapshot.exists && JSON.stringify(snapshot.data()) !== JSON.stringify(entries[index].data)) throw new Error(`${reference.id}: conflict ${snapshot.ref.path}, nothing overwritten.`);
    }
    tx.create(database.collection('exam_content_migration_backups').doc(reference.id), { version: '1.8.27', original: value, migratedAt: FieldValue.serverTimestamp() });
    entries.forEach((entry, index) => { if (!existing[index].exists) tx.create(entry.ref, entry.data); });
    tx.update(reference, { questions: FieldValue.delete(), sections: FieldValue.delete() });
    return true;
  });
}
